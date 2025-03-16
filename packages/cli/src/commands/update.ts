import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { glob } from 'glob';
import { getComponentInfo, getInstalledComponentVersion } from '../utils/registry.js';
import { add } from './add.js';
import { getConfig } from '../utils/config.js';

interface UpdateOptions {
  cwd?: string;
  path?: string;
  force?: boolean;
}

export async function update(componentName: string, options: UpdateOptions = {}) {
  const cwd = options.cwd || process.cwd();
  
  // Get config
  const config = await getConfig(cwd);
  
  if (!config) {
    throw new Error(
      'No configuration found. Run `dataface init` to initialize your project.'
    );
  }
  
  // Get component info from registry
  const latestInfo = await getComponentInfo(componentName);
  
  // Find component in project
  const componentsDir = options.path || config.componentsDir || 'components';
  const componentDir = path.join(cwd, componentsDir, componentName);
  
  if (!await fs.pathExists(componentDir)) {
    throw new Error(
      `Component ${componentName} not found in your project. Use \`dataface add ${componentName}\` to add it.`
    );
  }
  
  // Get current version from component file
  const currentVersion = await getInstalledComponentVersion(componentName, componentDir);
  
  if (!currentVersion) {
    console.log(
      chalk.yellow(
        `Could not determine the current version of ${componentName}. It may have been modified or added manually.`
      )
    );
    
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Do you want to update ${componentName} anyway?`,
          default: false
        }
      ]);
      
      if (!confirm) {
        return;
      }
    }
  } else if (currentVersion === latestInfo.version) {
    console.log(
      chalk.green(`Component ${componentName} is already up to date (v${currentVersion}).`)
    );
    return;
  } else {
    console.log(
      `Updating ${componentName} from v${currentVersion} to v${latestInfo.version}`
    );
  }
  
  // Prompt for confirmation
  if (!options.force) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'This will overwrite any customizations you have made. Continue?',
        default: false
      }
    ]);
    
    if (!confirm) {
      return;
    }
  }
  
  // Back up existing component
  const backupDir = path.join(cwd, '.dataface', 'backups', `${componentName}-${Date.now()}`);
  const spinner = ora(`Backing up ${componentName}...`).start();
  
  try {
    await fs.ensureDir(backupDir);
    await fs.copy(componentDir, backupDir);
    spinner.succeed(`Backed up ${componentName} to ${backupDir}`);
  } catch (error) {
    spinner.fail(`Failed to back up ${componentName}`);
    
    if (!options.force) {
      const { continueWithoutBackup } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueWithoutBackup',
          message: 'Failed to create backup. Continue anyway?',
          default: false
        }
      ]);
      
      if (!continueWithoutBackup) {
        return;
      }
    }
  }
  
  // Fetch and install new version
  await add(componentName, {
    ...options,
    overwrite: true
  });
  
  console.log(chalk.green(`✅ Updated ${componentName} to v${latestInfo.version}`));
} 