import { getRegistry } from '../utils/registry.js';
import chalk from 'chalk';

export async function list() {
  const registry = await getRegistry();
  
  // Group by category
  const categories: Record<string, any[]> = {};
  for (const component of registry.components) {
    if (!categories[component.category]) {
      categories[component.category] = [];
    }
    categories[component.category].push(component);
  }
  
  // Print components by category
  console.log(chalk.bold('\nAvailable components:'));
  
  for (const [category, components] of Object.entries(categories)) {
    // Find category display name
    const categoryInfo = registry.categories.find(c => c.name === category);
    console.log(`\n${chalk.cyan(categoryInfo?.display || category)}:`);
    
    // List components
    for (const component of components) {
      console.log(`  ${chalk.green(component.name)} - ${component.description}`);
    }
  }
} 