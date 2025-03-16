import path from 'path';
import fs from 'fs-extra';
import { cosmiconfig } from 'cosmiconfig';

/**
 * Dataface configuration schema
 */
export interface DatafaceConfig {
  style: 'default' | 'minimal' | 'linear';
  rsc: boolean;
  tsx: boolean;
  tailwind: {
    config: string;
    css: string;
    baseColor: string;
    cssVariables: boolean;
  };
  aliases: {
    components: string;
    utils: string;
    [key: string]: string;
  };
}

/**
 * Load the Dataface configuration from components.json
 */
export async function loadConfig(cwd = process.cwd()): Promise<DatafaceConfig | null> {
  // Use cosmiconfig to find the configuration file
  const explorer = cosmiconfig('dataface', {
    searchPlaces: [
      'components.json',
      'dataface.config.js',
      'dataface.config.json',
    ],
  });
  
  const result = await explorer.search(cwd);
  
  if (!result || result.isEmpty) {
    return null;
  }
  
  // Validate the configuration
  validateConfig(result.config);
  
  return result.config as DatafaceConfig;
}

/**
 * Validate the Dataface configuration
 */
function validateConfig(config: any): void {
  // Check if the configuration is an object
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration: Configuration must be an object.');
  }
  
  // Check required fields
  const requiredFields = ['style', 'rsc', 'tsx', 'tailwind', 'aliases'];
  for (const field of requiredFields) {
    if (!(field in config)) {
      throw new Error(`Invalid configuration: Missing required field "${field}".`);
    }
  }
  
  // Validate style
  if (!['default', 'minimal', 'linear'].includes(config.style)) {
    throw new Error(`Invalid configuration: "style" must be one of: default, minimal, linear.`);
  }
  
  // Validate rsc and tsx
  if (typeof config.rsc !== 'boolean') {
    throw new Error('Invalid configuration: "rsc" must be a boolean.');
  }
  if (typeof config.tsx !== 'boolean') {
    throw new Error('Invalid configuration: "tsx" must be a boolean.');
  }
  
  // Validate tailwind
  if (!config.tailwind || typeof config.tailwind !== 'object') {
    throw new Error('Invalid configuration: "tailwind" must be an object.');
  }
  
  const requiredTailwindFields = ['config', 'css', 'baseColor', 'cssVariables'];
  for (const field of requiredTailwindFields) {
    if (!(field in config.tailwind)) {
      throw new Error(`Invalid configuration: Missing required field "tailwind.${field}".`);
    }
  }
  
  // Validate aliases
  if (!config.aliases || typeof config.aliases !== 'object') {
    throw new Error('Invalid configuration: "aliases" must be an object.');
  }
  
  if (!('components' in config.aliases)) {
    throw new Error('Invalid configuration: Missing required field "aliases.components".');
  }
  if (!('utils' in config.aliases)) {
    throw new Error('Invalid configuration: Missing required field "aliases.utils".');
  }
}

/**
 * Create a default Dataface configuration
 */
export function createConfig(options: {
  style?: 'default' | 'minimal' | 'linear';
  rsc?: boolean;
  tsx?: boolean;
  tailwindConfig?: string;
  tailwindCss?: string;
  baseColor?: string;
  cssVariables?: boolean;
  componentsAlias?: string;
  utilsAlias?: string;
}): DatafaceConfig {
  return {
    style: options.style || 'default',
    rsc: options.rsc ?? true,
    tsx: options.tsx ?? true,
    tailwind: {
      config: options.tailwindConfig || 'tailwind.config.js',
      css: options.tailwindCss || 'app/globals.css',
      baseColor: options.baseColor || 'slate',
      cssVariables: options.cssVariables ?? true,
    },
    aliases: {
      components: options.componentsAlias || '@/components',
      utils: options.utilsAlias || '@/lib/utils',
    },
  };
}

/**
 * Write the Dataface configuration to components.json
 */
export async function writeConfig(config: DatafaceConfig, cwd = process.cwd()): Promise<void> {
  const configPath = path.join(cwd, 'components.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
} 