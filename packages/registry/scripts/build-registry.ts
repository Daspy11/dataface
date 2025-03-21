import fs from 'fs-extra';
import path from 'path';
import glob from 'fast-glob';

interface ComponentMetadata {
  name: string;
  display?: string;
  category?: string;
  description?: string;
  dependencies?: string[];
  registryDependencies?: string[];
  type?: string;
  files?: string[];
  version?: string;
  styles?: string[];
  examples?: Array<{
    name: string;
    code: string;
  }>;
  propInterface?: string;
  aria?: string;
  author?: {
    name: string;
    url: string;
  };
  maintainers?: Array<{
    name: string;
    github: string;
  }>;
  status?: string;
}

interface Category {
  name: string;
  display: string;
  description: string;
}

interface Registry {
  schema: string;
  version: string;
  components: ComponentMetadata[];
  categories: Category[];
}

async function buildRegistry() {
  // 1. Find all component directories
  const componentDirs = await glob('src/*', {
    cwd: path.join(__dirname, '..'),
    onlyDirectories: true
  });
  
  // 2. Read each component's metadata
  const components: ComponentMetadata[] = [];
  const categories: Record<string, Category> = {};
  
  for (const dir of componentDirs) {
    const name = path.basename(dir);
    const metadataPath = path.join(__dirname, '..', dir, 'metadata.json');
    
    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath) as ComponentMetadata;
      
      // Add component to the registry
      components.push({
        name,
        display: metadata.display || toTitleCase(name),
        category: metadata.category || 'misc',
        description: metadata.description || '',
        dependencies: metadata.dependencies || [],
        registryDependencies: metadata.registryDependencies || [],
        type: metadata.type || 'component',
        files: metadata.files || [],
        version: metadata.version || '1.0.0'
      });
      
      // Track categories
      if (metadata.category && !categories[metadata.category]) {
        categories[metadata.category] = {
          name: metadata.category,
          display: toTitleCase(metadata.category),
          description: `${toTitleCase(metadata.category)} components.`
        };
      }
    }
  }
  
  // 3. Build the registry index
  const registry: Registry = {
    schema: "https://dataface.dev/schema/registry.json",
    version: require('../package.json').version,
    components,
    categories: Object.values(categories)
  };
  
  // 4. Write the registry index
  await fs.writeJson(
    path.join(__dirname, '..', 'registry.json'),
    registry,
    { spaces: 2 }
  );
  
  console.log(`✅ Registry built with ${components.length} components and ${Object.keys(categories).length} categories.`);
  
  // 5. Generate TypeScript types for the registry
  await generateTypeDefinitions(registry);
}

/**
 * Generates TypeScript type definitions for the registry
 */
async function generateTypeDefinitions(registry: Registry) {
  const typesPath = path.join(__dirname, '..', 'src', 'types', 'registry.d.ts');
  
  // Create types directory if it doesn't exist
  await fs.ensureDir(path.dirname(typesPath));
  
  // Generate component name union type
  const componentNames = registry.components.map(c => `"${c.name}"`).join(' | ');
  const categoryNames = registry.categories.map(c => `"${c.name}"`).join(' | ');
  
  const typesContent = `/**
 * This file is auto-generated by build-registry.ts
 * Do not edit manually.
 */

export type ComponentName = ${componentNames};
export type CategoryName = ${categoryNames};

export interface ComponentMeta {
  name: string;
  display: string;
  category: CategoryName;
  description: string;
  dependencies: string[];
  registryDependencies: ComponentName[];
  type: "component" | "utility";
  files: string[];
  version: string;
}

export interface Category {
  name: CategoryName;
  display: string;
  description: string;
}

export interface Registry {
  schema: string;
  version: string;
  components: ComponentMeta[];
  categories: Category[];
}
`;

  await fs.writeFile(typesPath, typesContent);
  console.log(`✅ Registry type definitions generated at ${typesPath}`);
}

/**
 * Converts a string to title case
 */
function toTitleCase(str: string): string {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}

// Run the build script
buildRegistry().catch(console.error); 