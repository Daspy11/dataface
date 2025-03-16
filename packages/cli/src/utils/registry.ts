import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { glob } from 'glob';
import { execa } from 'execa';
import simpleGit from 'simple-git';
import ora from 'ora';
import fetch from 'node-fetch';
import { DatafaceConfig } from './config.js';

// Cache for registry data
let registryCache: Registry | null = null;

interface ComponentMeta {
  name: string;
  display: string;
  category: string;
  description: string;
  dependencies: string[];
  registryDependencies: string[];
  type: "component" | "utility";
  files: string[];
  version: string;
}

interface Category {
  name: string;
  display: string;
  description: string;
}

interface Registry {
  schema: string;
  version: string;
  components: ComponentMeta[];
  categories: Category[];
}

/**
 * Loads the registry index from GitHub or local cache
 */
export async function getRegistry(): Promise<Registry> {
  if (registryCache) {
    return registryCache;
  }
  
  try {
    // Try to fetch from GitHub first for latest data
    const response = await fetch(
      'https://raw.githubusercontent.com/dataface/dataface/main/packages/registry/registry.json'
    );
    
    if (response.ok) {
      registryCache = await response.json() as Registry;
      return registryCache;
    }
  } catch (error) {
    // Fall back to local copy if GitHub is unreachable
    console.warn('Unable to fetch registry from GitHub, using local cache');
  }
  
  // Try to load from npm package
  try {
    // Create a temporary directory
    const tempDir = path.join(os.tmpdir(), `dataface-registry-${Date.now()}`);
    await fs.mkdirp(tempDir);
    
    const packageJson = {
      name: 'temp-registry',
      version: '1.0.0',
      private: true
    };
    
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Install the registry package
    await execa('npm', ['install', '@dataface/registry@latest'], { cwd: tempDir });
    
    // Read registry.json
    const registryPath = path.join(tempDir, 'node_modules', '@dataface/registry', 'registry.json');
    
    if (await fs.pathExists(registryPath)) {
      registryCache = await fs.readJson(registryPath) as Registry;
      
      // Clean up
      await fs.remove(tempDir);
      
      return registryCache;
    }
    
    // Clean up
    await fs.remove(tempDir);
  } catch (error) {
    throw new Error(
      'Unable to load component registry. Please check your internet connection.'
    );
  }
  
  throw new Error('Unable to load component registry.');
}

/**
 * Gets metadata for a specific component
 */
export async function getComponentInfo(name: string): Promise<ComponentMeta> {
  const registry = await getRegistry();
  const component = registry.components.find(c => c.name === name);
  
  if (!component) {
    throw new Error(`Component "${name}" not found in registry.`);
  }
  
  return component;
}

/**
 * Resolves all dependencies for a component
 */
export async function resolveComponentDependencies(name: string): Promise<string[]> {
  const component = await getComponentInfo(name);
  const dependencies = [...component.dependencies];
  
  // Recursively resolve registry dependencies
  for (const depName of component.registryDependencies) {
    const depComponent = await getComponentInfo(depName);
    dependencies.push(...depComponent.dependencies);
  }
  
  // Deduplicate
  return [...new Set(dependencies)];
}

/**
 * Check if a component exists in the registry
 */
export async function checkComponentExists(component: string): Promise<boolean> {
  try {
    // Try to fetch the component metadata
    await getComponentInfo(component);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Fetch component files from the registry
 */
export async function fetchComponentFiles(
  component: string,
  config?: DatafaceConfig
): Promise<Record<string, string>> {
  // Get component info to verify it exists
  await getComponentInfo(component);
  
  // Try Git-based registry access first
  try {
    return await fetchFromGit(component, config);
  } catch (error) {
    // Fall back to NPM-based registry access
    try {
      return await fetchFromNpm(component, config);
    } catch (npmError) {
      throw new Error(`Component '${component}' not found in registry.`);
    }
  }
}

/**
 * Fetch component files from Git repository
 */
async function fetchFromGit(
  component: string,
  config?: DatafaceConfig
): Promise<Record<string, string>> {
  const repoUrl = 'https://github.com/dataface/dataface.git';
  const style = config?.style || 'default';
  
  // Get component info
  const componentInfo = await getComponentInfo(component);
  
  // Determine path for the style variant
  let stylePath = 'default';
  if (componentInfo.type === 'component') {
    // Check if component metadata exists to get available styles
    try {
      const tempDir = path.join(os.tmpdir(), `dataface-meta-${Date.now()}`);
      await execa('git', [
        'clone',
        '--depth=1',
        '--filter=blob:none',
        '--sparse',
        repoUrl,
        tempDir
      ]);
      
      const git = simpleGit(tempDir);
      await git.raw('sparse-checkout', 'set', `packages/registry/src/${component}/metadata.json`);
      
      const metadataPath = path.join(tempDir, 'packages/registry/src', component, 'metadata.json');
      
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJson(metadataPath);
        if (metadata.styles && metadata.styles.includes(style)) {
          stylePath = style;
        }
      }
      
      // Clean up
      await fs.remove(tempDir);
    } catch (error) {
      // If we can't get metadata, default to 'default' style
      console.warn(`Could not fetch metadata for ${component}, using default style`);
    }
  }
  
  const componentPath = `packages/registry/src/${component}${
    componentInfo.type === 'component' ? `/styles/${stylePath}` : ''
  }`;
  
  const tempDir = path.join(os.tmpdir(), `dataface-${Date.now()}`);
  
  const spinner = ora(`Fetching ${component} component from registry...`).start();
  
  try {
    // Sparse checkout just the needed component
    await execa('git', [
      'clone',
      '--depth=1',
      '--filter=blob:none',
      '--sparse',
      repoUrl,
      tempDir
    ]);
    
    const git = simpleGit(tempDir);
    await git.raw('sparse-checkout', 'set', componentPath);
    
    // Read all files in the component directory
    const files: Record<string, string> = {};
    const componentDir = path.join(tempDir, componentPath);
    
    if (!fs.existsSync(componentDir)) {
      throw new Error(`Component '${component}' not found in registry.`);
    }
    
    const filePaths = await glob('**/*', { cwd: componentDir, nodir: true });
    
    for (const filePath of filePaths) {
      const content = await fs.readFile(path.join(componentDir, filePath), 'utf8');
      files[filePath] = content;
    }
    
    // Also fetch registry dependencies
    for (const depName of componentInfo.registryDependencies) {
      try {
        const depFiles = await fetchFromGit(depName, config);
        
        // Add dependency files with prefixed paths
        for (const [filePath, content] of Object.entries(depFiles)) {
          files[`${depName}/${filePath}`] = content;
        }
      } catch (error) {
        console.warn(`Failed to fetch dependency ${depName}`);
      }
    }
    
    // Clean up
    await fs.remove(tempDir);
    
    spinner.succeed(`Fetched ${component} component`);
    
    return files;
  } catch (error) {
    spinner.fail(`Failed to fetch ${component} component from Git`);
    throw error;
  }
}

/**
 * Fetch component files from NPM package
 */
async function fetchFromNpm(
  component: string,
  config?: DatafaceConfig
): Promise<Record<string, string>> {
  const spinner = ora(`Fetching ${component} component from npm...`).start();
  const style = config?.style || 'default';
  
  try {
    // Get component info
    const componentInfo = await getComponentInfo(component);
    
    // Create a temporary directory
    const tempDir = path.join(os.tmpdir(), `dataface-npm-${Date.now()}`);
    await fs.mkdirp(tempDir);
    
    const packageJson = {
      name: 'temp-install',
      version: '1.0.0',
      private: true
    };
    
    await fs.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Install the registry package
    await execa('npm', ['install', '@dataface/registry@latest'], { cwd: tempDir });
    
    // Read component files
    const registryPath = path.join(tempDir, 'node_modules', '@dataface/registry');
    
    // Determine style path
    let stylePath = 'default';
    if (componentInfo.type === 'component') {
      const metadataPath = path.join(registryPath, 'src', component, 'metadata.json');
      
      if (await fs.pathExists(metadataPath)) {
        const metadata = await fs.readJson(metadataPath);
        if (metadata.styles && metadata.styles.includes(style)) {
          stylePath = style;
        }
      }
    }
    
    const componentDir = path.join(
      registryPath,
      'src',
      component,
      componentInfo.type === 'component' ? `styles/${stylePath}` : ''
    );
    
    if (!fs.existsSync(componentDir)) {
      throw new Error(`Component '${component}' not found in registry.`);
    }
    
    const files: Record<string, string> = {};
    const filePaths = await glob('**/*', { cwd: componentDir, nodir: true });
    
    for (const filePath of filePaths) {
      const content = await fs.readFile(path.join(componentDir, filePath), 'utf8');
      files[filePath] = content;
    }
    
    // Also fetch registry dependencies
    for (const depName of componentInfo.registryDependencies) {
      try {
        const depFiles = await fetchFromNpm(depName, config);
        
        // Add dependency files with prefixed paths
        for (const [filePath, content] of Object.entries(depFiles)) {
          files[`${depName}/${filePath}`] = content;
        }
      } catch (error) {
        console.warn(`Failed to fetch dependency ${depName}`);
      }
    }
    
    // Clean up
    await fs.remove(tempDir);
    
    spinner.succeed(`Fetched ${component} component`);
    
    return files;
  } catch (error) {
    spinner.fail(`Failed to fetch ${component} component from npm`);
    throw error;
  }
}

/**
 * Get dependencies for a component
 */
export async function getDependenciesForComponent(component: string): Promise<string[]> {
  return resolveComponentDependencies(component);
}

/**
 * Get installed component version
 */
export async function getInstalledComponentVersion(
  componentName: string,
  componentDir: string
): Promise<string | null> {
  const metadataComment = new RegExp(`@dataface-version\\s+${componentName}\\s+v([\\d.]+)`, 'i');
  
  try {
    // Look for version comment in component files
    const files = await glob('**/*.{ts,tsx,js,jsx}', { cwd: componentDir });
    
    for (const file of files) {
      const content = await fs.readFile(path.join(componentDir, file), 'utf8');
      const match = content.match(metadataComment);
      
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
} 