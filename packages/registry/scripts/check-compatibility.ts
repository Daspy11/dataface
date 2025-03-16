import fs from 'fs-extra';
import path from 'path';
import semver from 'semver';

interface ComponentMetadata {
  name: string;
  version: string;
  dependencies?: string[];
  registryDependencies?: string[];
  propInterface?: string;
  files?: string[];
}

interface Registry {
  components: ComponentMetadata[];
}

/**
 * Checks if a component has breaking changes compared to its previous version
 */
function hasBreakingChanges(
  oldComponent: ComponentMetadata,
  newComponent: ComponentMetadata
): boolean {
  // Check for removed dependencies (could break existing code)
  const removedDeps = (oldComponent.dependencies || []).filter(
    (dep) => !(newComponent.dependencies || []).includes(dep)
  );
  
  // Check for removed registry dependencies
  const removedRegDeps = (oldComponent.registryDependencies || []).filter(
    (dep) => !(newComponent.registryDependencies || []).includes(dep)
  );
  
  // Check for changes in prop interface (could break existing code)
  const propInterfaceChanged = 
    oldComponent.propInterface !== newComponent.propInterface;
  
  // Check for removed files
  const removedFiles = (oldComponent.files || []).filter(
    (file) => !(newComponent.files || []).includes(file)
  );
  
  return (
    removedDeps.length > 0 ||
    removedRegDeps.length > 0 ||
    propInterfaceChanged ||
    removedFiles.length > 0
  );
}

async function checkCompatibility() {
  try {
    // Load the previous registry version
    const oldRegistryPath = path.join(__dirname, '..', 'dist', 'registry.json');
    const newRegistryPath = path.join(__dirname, '..', 'registry.json');
    
    // Check if old registry exists
    if (!await fs.pathExists(oldRegistryPath)) {
      console.log('No previous registry found. Skipping compatibility check.');
      return;
    }
    
    const oldRegistry = await fs.readJson(oldRegistryPath) as Registry;
    const newRegistry = await fs.readJson(newRegistryPath) as Registry;
    
    let hasBreakingChangesWithoutVersionBump = false;
    
    for (const newComponent of newRegistry.components) {
      // Find the component in the old registry
      const oldComponent = oldRegistry.components.find(c => c.name === newComponent.name);
      
      if (oldComponent) {
        // Check if the component has breaking changes
        const isBreaking = hasBreakingChanges(oldComponent, newComponent);
        
        if (isBreaking) {
          console.log(`Component ${newComponent.name} has breaking changes.`);
          
          // Ensure version is bumped appropriately
          if (!semver.gt(newComponent.version, oldComponent.version)) {
            console.error(
              `⚠️ Component ${newComponent.name} has breaking changes but version was not bumped.`
            );
            hasBreakingChangesWithoutVersionBump = true;
          } else {
            // Check if it's a major version bump for breaking changes
            const oldParts = semver.parse(oldComponent.version);
            const newParts = semver.parse(newComponent.version);
            
            if (oldParts && newParts && newParts.major === oldParts.major) {
              console.warn(
                `⚠️ Component ${newComponent.name} has breaking changes but only has a minor/patch version bump.`
              );
            } else {
              console.log(
                `✅ Component ${newComponent.name} has breaking changes and version was bumped correctly.`
              );
            }
          }
        } else if (semver.gt(newComponent.version, oldComponent.version)) {
          console.log(
            `✅ Component ${newComponent.name} was updated from v${oldComponent.version} to v${newComponent.version}.`
          );
        }
      } else {
        console.log(`✅ New component added: ${newComponent.name} v${newComponent.version}`);
      }
    }
    
    // Check for removed components
    for (const oldComponent of oldRegistry.components) {
      const stillExists = newRegistry.components.some(c => c.name === oldComponent.name);
      
      if (!stillExists) {
        console.warn(`⚠️ Component ${oldComponent.name} was removed from the registry.`);
      }
    }
    
    if (hasBreakingChangesWithoutVersionBump) {
      process.exit(1);
    }
    
    console.log('✅ Compatibility check completed successfully.');
  } catch (error) {
    console.error('Error checking compatibility:', error);
    process.exit(1);
  }
}

// Run the compatibility check
checkCompatibility().catch(console.error); 