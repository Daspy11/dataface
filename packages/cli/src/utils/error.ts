import chalk from 'chalk';

/**
 * Handle CLI errors with helpful messages
 */
export function handleCliError(error: Error): void {
  console.error(chalk.red(`ERROR: ${error.message}`));
  
  // Provide context-specific help
  if (error.message.includes('components.json')) {
    console.log(chalk.yellow('\nTip: Run `npx dataface init` to set up your project.'));
  } else if (error.message.includes('not found in registry')) {
    console.log(chalk.yellow('\nAvailable components:'));
    console.log(chalk.gray('  npx dataface add button'));
    console.log(chalk.gray('  npx dataface add card'));
    console.log(chalk.gray('  npx dataface add dialog'));
    console.log(chalk.gray('  npx dataface add dropdown-menu'));
    console.log(chalk.gray('  npx dataface add table'));
    console.log(chalk.gray('  npx dataface add tabs'));
    console.log(chalk.gray('  npx dataface add toast'));
    console.log(chalk.gray('\nRun `npx dataface add --help` for more information.'));
  }
  
  process.exit(1);
} 