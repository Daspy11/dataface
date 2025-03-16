import path from 'path';
import fs from 'fs-extra';

/**
 * Project type
 */
export type ProjectType = 'next' | 'react' | 'vite' | 'remix' | 'astro' | 'unknown';

/**
 * Detect the project type
 */
export async function detectProjectType(cwd = process.cwd()): Promise<ProjectType> {
  // Check for package.json
  const packageJsonPath = path.join(cwd, 'package.json');
  if (!await fs.pathExists(packageJsonPath)) {
    return 'unknown';
  }
  
  // Read package.json
  const packageJson = await fs.readJson(packageJsonPath);
  const { dependencies = {}, devDependencies = {} } = packageJson;
  const allDependencies = { ...dependencies, ...devDependencies };
  
  // Check for Next.js
  if (allDependencies.next) {
    return 'next';
  }
  
  // Check for Remix
  if (allDependencies['@remix-run/react']) {
    return 'remix';
  }
  
  // Check for Astro
  if (allDependencies.astro) {
    return 'astro';
  }
  
  // Check for Vite
  if (allDependencies.vite) {
    return 'vite';
  }
  
  // Check for React
  if (allDependencies.react) {
    return 'react';
  }
  
  return 'unknown';
}

/**
 * Detect if the project uses TypeScript
 */
export async function detectTypeScript(cwd = process.cwd()): Promise<boolean> {
  // Check for tsconfig.json
  const tsconfigPath = path.join(cwd, 'tsconfig.json');
  return await fs.pathExists(tsconfigPath);
}

/**
 * Detect if the project uses React Server Components
 */
export async function detectRSC(cwd = process.cwd()): Promise<boolean> {
  // Check for Next.js
  const projectType = await detectProjectType(cwd);
  if (projectType !== 'next') {
    return false;
  }
  
  // Check for Next.js version
  const packageJsonPath = path.join(cwd, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  const nextVersion = packageJson.dependencies?.next || packageJson.devDependencies?.next;
  
  if (!nextVersion) {
    return false;
  }
  
  // Check if Next.js version is >= 13
  const versionMatch = nextVersion.match(/^[~^]?(\d+)/);
  if (versionMatch && parseInt(versionMatch[1]) >= 13) {
    return true;
  }
  
  return false;
} 