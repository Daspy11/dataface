import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { createConfig, writeConfig } from '../utils/config.js';
import { detectProjectType, detectTypeScript, detectRSC } from '../utils/project.js';
import { setupTailwind } from '../utils/tailwind.js';

/**
 * Init command options
 */
export interface InitOptions {
  cwd?: string;
  yes?: boolean;
  tailwind?: boolean;
}

/**
 * Initialize a project with Dataface
 */
export async function init(options: InitOptions = {}): Promise<void> {
  const { cwd = process.cwd(), yes = false } = options;
  
  // Check if components.json already exists
  const configPath = path.join(cwd, 'components.json');
  if (await fs.pathExists(configPath)) {
    const { overwrite } = yes ? { overwrite: true } : await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'components.json already exists. Overwrite?',
        default: false,
      },
    ]);
    
    if (!overwrite) {
      console.log(chalk.yellow('Initialization cancelled.'));
      return;
    }
  }
  
  // Detect project environment
  const spinner = ora('Analyzing project...').start();
  const projectType = await detectProjectType(cwd);
  const typescript = await detectTypeScript(cwd);
  const rsc = await detectRSC(cwd);
  spinner.succeed(`Project type: ${chalk.cyan(projectType)}`);
  
  // Prompt for configuration options
  const answers = yes ? {
    typescript,
    rsc,
    style: 'default',
    tailwind: options.tailwind ?? true,
    baseColor: 'slate',
    cssVariables: true,
    componentsDir: 'components',
    utilsDir: 'lib/utils',
  } : await inquirer.prompt([
    {
      type: 'confirm',
      name: 'typescript',
      message: 'Does your project use TypeScript?',
      default: typescript,
    },
    {
      type: 'confirm',
      name: 'rsc',
      message: 'Are you using React Server Components?',
      default: rsc,
    },
    {
      type: 'list',
      name: 'style',
      message: 'Which style would you like to use?',
      choices: [
        { name: 'Default', value: 'default' },
        { name: 'Minimal', value: 'minimal' },
        { name: 'Linear', value: 'linear' },
      ],
      default: 'default',
    },
    {
      type: 'confirm',
      name: 'tailwind',
      message: 'Would you like to set up Tailwind CSS?',
      default: true,
    },
    {
      type: 'list',
      name: 'baseColor',
      message: 'Which color would you like to use as the base color?',
      choices: [
        { name: 'Slate', value: 'slate' },
        { name: 'Gray', value: 'gray' },
        { name: 'Zinc', value: 'zinc' },
        { name: 'Neutral', value: 'neutral' },
        { name: 'Stone', value: 'stone' },
      ],
      default: 'slate',
      when: (answers) => answers.tailwind,
    },
    {
      type: 'confirm',
      name: 'cssVariables',
      message: 'Would you like to use CSS variables for colors?',
      default: true,
      when: (answers) => answers.tailwind,
    },
    {
      type: 'input',
      name: 'componentsDir',
      message: 'Where is your components directory?',
      default: 'components',
    },
    {
      type: 'input',
      name: 'utilsDir',
      message: 'Where is your utils directory?',
      default: 'lib/utils',
    },
  ]);
  
  // Determine tailwind config path based on project type
  let tailwindConfig = 'tailwind.config.js';
  let tailwindCss = 'src/styles/globals.css';
  
  if (projectType === 'next') {
    tailwindCss = 'app/globals.css';
  } else if (projectType === 'remix') {
    tailwindCss = 'app/styles/globals.css';
  } else if (projectType === 'astro') {
    tailwindCss = 'src/styles/globals.css';
  }
  
  // Create configuration
  const config = createConfig({
    style: answers.style,
    rsc: answers.rsc,
    tsx: answers.typescript,
    tailwindConfig,
    tailwindCss,
    baseColor: answers.baseColor,
    cssVariables: answers.cssVariables,
    componentsAlias: `@/${answers.componentsDir}`,
    utilsAlias: `@/${answers.utilsDir}`,
  });
  
  // Write configuration
  await writeConfig(config, cwd);
  console.log(chalk.green('✓ Created components.json'));
  
  // Set up Tailwind if needed
  if (answers.tailwind) {
    await setupTailwind(config, { cwd });
    console.log(chalk.green('✓ Set up Tailwind CSS'));
  }
  
  // Create utils directory and add utils.ts
  const utilsPath = path.join(cwd, answers.utilsDir);
  if (!await fs.pathExists(utilsPath)) {
    await fs.mkdirp(utilsPath);
    
    // Create utils.ts or utils.js
    const utilsFile = answers.typescript ? 'utils.ts' : 'utils.js';
    const utilsContent = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
    
    await fs.writeFile(path.join(utilsPath, utilsFile), utilsContent);
    console.log(chalk.green(`✓ Created ${answers.utilsDir}/${utilsFile}`));
    
    // Install clsx and tailwind-merge
    const spinner = ora('Installing dependencies...').start();
    try {
      const { execa } = await import('execa');
      await execa('npm', ['install', 'clsx', 'tailwind-merge'], { cwd });
      spinner.succeed('Dependencies installed');
    } catch (error) {
      spinner.fail('Failed to install dependencies');
      console.log(chalk.yellow('You need to install the following dependencies manually:'));
      console.log('  npm install clsx tailwind-merge');
    }
  }
  
  console.log();
  console.log(chalk.green('✓ Dataface has been initialized!'));
  console.log();
  console.log(`Run ${chalk.cyan('npx dataface add button')} to add your first component.`);
  console.log();
} 