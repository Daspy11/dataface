import path from 'path';
import fs from 'fs-extra';
import { DatafaceConfig } from './config.js';

/**
 * Transform component files based on configuration
 */
export async function transformFiles(
  files: Record<string, string>,
  config: DatafaceConfig
): Promise<Record<string, string>> {
  const transformed: Record<string, string> = {};
  
  for (const [filePath, content] of Object.entries(files)) {
    let newContent = content;
    
    // Add "use client" directive for RSC if needed
    if (config.rsc && filePath.endsWith('.tsx') && isClientComponent(content)) {
      newContent = `"use client";\n\n${content}`;
    }
    
    // Replace import paths based on aliases
    newContent = transformImportPaths(newContent, config.aliases);
    
    // Convert TypeScript to JavaScript if needed
    if (!config.tsx && filePath.endsWith('.tsx')) {
      newContent = await convertToJavaScript(newContent);
      transformed[filePath.replace('.tsx', '.jsx')] = newContent;
    } else {
      transformed[filePath] = newContent;
    }
  }
  
  return transformed;
}

/**
 * Check if a component is a client component
 */
function isClientComponent(content: string): boolean {
  // Check for hooks, event handlers, or browser APIs
  const clientPatterns = [
    /\buseState\b/,
    /\buseEffect\b/,
    /\buseRef\b/,
    /\buseReducer\b/,
    /\buseContext\b/,
    /\bonClick\b/,
    /\bonChange\b/,
    /\bonSubmit\b/,
    /\bdocument\b/,
    /\bwindow\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
  ];
  
  return clientPatterns.some(pattern => pattern.test(content));
}

/**
 * Transform import paths based on aliases
 */
function transformImportPaths(
  code: string,
  aliases: Record<string, string>
): string {
  // Simple regex-based transformation for now
  // In a real implementation, we would use jscodeshift for AST-based transformation
  
  let newCode = code;
  
  // Replace import paths
  for (const [alias, path] of Object.entries(aliases)) {
    const importRegex = new RegExp(`from ["']@/${alias}/([^"']+)["']`, 'g');
    newCode = newCode.replace(importRegex, `from "${path}/$1"`);
  }
  
  return newCode;
}

/**
 * Convert TypeScript to JavaScript
 */
async function convertToJavaScript(code: string): Promise<string> {
  // Remove type annotations
  let jsCode = code;
  
  // Remove import type statements
  jsCode = jsCode.replace(/import\s+type\s+.*?from\s+["'].*?["'];?/g, '');
  
  // Remove interface and type declarations
  jsCode = jsCode.replace(/^(export\s+)?(interface|type)\s+.*?{[\s\S]*?}.*?$/gm, '');
  
  // Remove type annotations from function parameters and return types
  jsCode = jsCode.replace(/:\s*[A-Za-z0-9_<>[\].,|&()\s]+(?=(,|\)|\s*=>|\s*{))/g, '');
  
  // Remove generic type parameters
  jsCode = jsCode.replace(/<[^>]+>/g, '');
  
  // Remove "as" type assertions
  jsCode = jsCode.replace(/\s+as\s+[A-Za-z0-9_<>[\].,|&()]+/g, '');
  
  // Clean up multiple blank lines
  jsCode = jsCode.replace(/\n{3,}/g, '\n\n');
  
  return jsCode;
}

/**
 * Write component files to the project
 */
export async function writeComponentFiles(
  component: string,
  files: Record<string, string>,
  config: DatafaceConfig,
  options: {
    cwd?: string;
    path?: string;
    overwrite?: boolean;
  } = {}
): Promise<void> {
  const { cwd = process.cwd(), path: outputPath, overwrite = false } = options;
  
  // Determine the output directory
  const componentsDir = outputPath || config.aliases.components.replace(/^@\//, '');
  const componentDir = path.join(cwd, componentsDir, component);
  
  // Create the component directory
  await fs.mkdirp(componentDir);
  
  // Write the files
  for (const [filePath, content] of Object.entries(files)) {
    const outputFilePath = path.join(componentDir, filePath);
    const outputFileDir = path.dirname(outputFilePath);
    
    // Create the directory if it doesn't exist
    await fs.mkdirp(outputFileDir);
    
    // Check if the file exists
    const fileExists = await fs.pathExists(outputFilePath);
    
    if (fileExists && !overwrite) {
      console.log(`Skipping ${outputFilePath} (already exists)`);
      continue;
    }
    
    // Write the file
    await fs.writeFile(outputFilePath, content);
    console.log(`Created ${outputFilePath}`);
  }
} 