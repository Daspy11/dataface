#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { init } from './commands/init.js';
import { add } from './commands/add.js';
import { list } from './commands/list.js';
import { update } from './commands/update.js';
import { handleCliError } from './utils/error.js';

// CLI version from package.json
const packageJson = await import('../package.json', { assert: { type: 'json' } });
const version = packageJson.default.version;

// Create the CLI program
const program = new Command()
  .name('dataface')
  .description('CLI for adding Dataface components to your project')
  .version(version);

// Init command
program
  .command('init')
  .description('Initialize your project with Dataface')
  .option('--cwd <cwd>', 'the working directory')
  .option('--yes', 'skip confirmation prompt', false)
  .option('--tailwind', 'install and configure Tailwind CSS', false)
  .action(async (options) => {
    try {
      await init(options);
    } catch (error) {
      handleCliError(error as Error);
    }
  });

// Add command
program
  .command('add <component...>')
  .description('Add a component to your project')
  .option('--cwd <cwd>', 'the working directory')
  .option('--path <path>', 'the path to add the component to')
  .option('--overwrite', 'overwrite existing files', false)
  .action(async (components, options) => {
    try {
      for (const component of components) {
        await add(component, options);
      }
    } catch (error) {
      handleCliError(error as Error);
    }
  });

// List command
program
  .command('list')
  .description('List all available components')
  .action(async () => {
    try {
      await list();
    } catch (error) {
      handleCliError(error as Error);
    }
  });

// Update command
program
  .command('update <component>')
  .description('Update a component to the latest version')
  .option('--cwd <cwd>', 'the working directory')
  .option('--path <path>', 'the path to the component')
  .option('--force', 'skip confirmation prompts', false)
  .action(async (component, options) => {
    try {
      await update(component, options);
    } catch (error) {
      handleCliError(error as Error);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no arguments provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 