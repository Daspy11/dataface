import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../utils/config.js';
import { checkComponentExists, fetchComponentFiles, getDependenciesForComponent } from '../utils/registry.js';
import { transformFiles, writeComponentFiles } from '../utils/transform.js';
import { installDependencies } from '../utils/npm.js';

/**
 * Add command options
 */
export interface AddOptions {
  cwd?: string;
  path?: string;
  overwrite?: boolean;
}

/**
 * Add a component to the project
 */
export async function add(component: string, options: AddOptions = {}): Promise<void> {
  const { cwd = process.cwd() } = options;
  
  // Load and validate configuration
  const config = await loadConfig(cwd);
  if (!config) {
    throw new Error('No components.json found. Run `npx dataface init` first.');
  }
  
  // Check if component exists in registry
  const exists = await checkComponentExists(component);
  if (!exists) {
    throw new Error(`Component '${component}' not found in registry.`);
  }
  
  // Fetch component from registry
  const spinner = ora(`Adding ${component} component...`).start();
  
  try {
    // Fetch component files
    const files = await fetchComponentFiles(component, config);
    
    // Transform component code based on configuration
    const transformedFiles = await transformFiles(files, config);
    
    // Write files to user's project
    await writeComponentFiles(component, transformedFiles, config, options);
    
    spinner.succeed(`Added ${component} component`);
    
    // Install dependencies if needed
    const dependencies = getDependenciesForComponent(component);
    if (dependencies.length > 0) {
      console.log(`Installing dependencies: ${dependencies.join(', ')}`);
      await installDependencies(dependencies, { cwd });
    }
    
    // Print success message
    console.log();
    console.log(`${chalk.green('✓')} Successfully added ${chalk.cyan(component)} component`);
    
    // Print usage example
    const componentDir = config.aliases.components.replace(/^@\//, '');
    const importPath = path.join(componentDir, component).replace(/\\/g, '/');
    
    console.log();
    console.log('Use the component in your project:');
    console.log();
    
    if (config.tsx) {
      console.log(chalk.gray(`import { ${component.charAt(0).toUpperCase() + component.slice(1)} } from "${importPath}"`));
    } else {
      console.log(chalk.gray(`import { ${component.charAt(0).toUpperCase() + component.slice(1)} } from "${importPath}"`));
    }
    
    console.log();
  } catch (error) {
    spinner.fail(`Failed to add ${component} component`);
    throw error;
  }
} 