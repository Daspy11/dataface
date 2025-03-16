import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import ora from 'ora';

/**
 * Detect the package manager used in the project
 */
export async function detectPackageManager(cwd = process.cwd()): Promise<'npm' | 'yarn' | 'pnpm'> {
  // Check for lockfiles
  const hasYarnLock = await fs.pathExists(path.join(cwd, 'yarn.lock'));
  if (hasYarnLock) return 'yarn';
  
  const hasPnpmLock = await fs.pathExists(path.join(cwd, 'pnpm-lock.yaml'));
  if (hasPnpmLock) return 'pnpm';
  
  // Default to npm
  return 'npm';
}

/**
 * Install dependencies
 */
export async function installDependencies(
  dependencies: string[],
  options: {
    cwd?: string;
    dev?: boolean;
  } = {}
): Promise<void> {
  if (dependencies.length === 0) return;
  
  const { cwd = process.cwd(), dev = false } = options;
  
  // Detect package manager
  const packageManager = await detectPackageManager(cwd);
  
  // Choose the appropriate install command
  const installCommand = {
    npm: 'install',
    yarn: 'add',
    pnpm: 'add',
  }[packageManager];
  
  // Add --save-dev flag if needed
  const args = [installCommand];
  if (dev) {
    args.push(packageManager === 'npm' ? '--save-dev' : '--dev');
  }
  args.push(...dependencies);
  
  // Install dependencies
  const spinner = ora(`Installing dependencies with ${packageManager}...`).start();
  
  try {
    await execa(packageManager, args, { cwd });
    spinner.succeed('Dependencies installed');
  } catch (error) {
    spinner.fail('Failed to install dependencies');
    console.error(`Run \`${packageManager} ${installCommand} ${dependencies.join(' ')}\` manually.`);
    throw error;
  }
} 