#!/usr/bin/env node

/**
 * Setup script for EmulatorJS
 * 
 * This script attempts to set up EmulatorJS files. Since the npm packages
 * may not include all necessary files, it tries multiple approaches:
 * 1. Copy from npm packages (if they contain files)
 * 2. Use existing files in public/emulatorjs/ (if already downloaded)
 * 3. Provide instructions for manual download
 * 
 * For best results, download EmulatorJS manually from:
 * https://github.com/EmulatorJS/EmulatorJS/releases/latest
 * or use the CDN: https://cdn.emulatorjs.org/stable/data/
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public', 'emulatorjs');
const nodeModulesDir = path.join(projectRoot, 'node_modules');
// In workspace setups, packages may be hoisted to root
const rootNodeModulesDir = path.join(projectRoot, '..', '..', 'node_modules');

// Paths to npm packages - check both local and root (for workspace hoisting)
function findPackage(packageName) {
  const localPath = path.join(nodeModulesDir, '@emulatorjs', packageName);
  const rootPath = path.join(rootNodeModulesDir, '@emulatorjs', packageName);
  
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  if (fs.existsSync(rootPath)) {
    return rootPath;
  }
  return null;
}

const emulatorjsPackage = findPackage('emulatorjs');
const coresPackage = findPackage('cores');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  ensureDir(dest);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function listPackageContents(pkgPath, label) {
  if (!fs.existsSync(pkgPath)) {
    console.log(`${label}: Package not found at ${pkgPath}`);
    return;
  }
  console.log(`\n${label} contents:`);
  try {
    const entries = fs.readdirSync(pkgPath, { withFileTypes: true });
    for (const entry of entries) {
      const type = entry.isDirectory() ? '[DIR]' : '[FILE]';
      console.log(`  ${type} ${entry.name}`);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const subPath = path.join(pkgPath, entry.name);
        try {
          const subEntries = fs.readdirSync(subPath, { withFileTypes: true });
          console.log(`    (${subEntries.length} items)`);
        } catch (e) {
          // Ignore
        }
      }
    }
  } catch (error) {
    console.log(`  Error reading: ${error.message}`);
  }
}

function main() {
  console.log('Setting up EmulatorJS...');
  
  // Check if packages are installed (may be in root node_modules due to workspace hoisting)
  if (!emulatorjsPackage) {
    console.warn('Warning: @emulatorjs/emulatorjs not found.');
    console.warn(`Checked: ${path.join(nodeModulesDir, '@emulatorjs', 'emulatorjs')}`);
    console.warn(`Checked: ${path.join(rootNodeModulesDir, '@emulatorjs', 'emulatorjs')}`);
    console.warn('This is OK if you plan to use CDN or manual installation.');
  }
  
  if (!coresPackage) {
    console.warn('Warning: @emulatorjs/cores not found.');
    console.warn(`Checked: ${path.join(nodeModulesDir, '@emulatorjs', 'cores')}`);
    console.warn(`Checked: ${path.join(rootNodeModulesDir, '@emulatorjs', 'cores')}`);
    console.warn('This is OK if you plan to use CDN or manual installation.');
  }
  
  // If packages aren't installed, check for existing files
  if (!emulatorjsPackage && !coresPackage) {
    const existingLoader = fs.existsSync(path.join(publicDir, 'loader.js')) || 
                          fs.existsSync(path.join(publicDir, 'data', 'loader.js'));
    const existingData = fs.existsSync(path.join(publicDir, 'data', 'emulator.min.js')) ||
                         fs.existsSync(path.join(publicDir, 'data', 'emulator.js'));
    
    if (existingLoader && existingData) {
      console.log('✓ Found existing EmulatorJS files - setup complete!');
      return;
    }
    
    console.log('\n⚠ EmulatorJS packages not installed and no existing files found.');
    console.log('To install EmulatorJS, you have two options:');
    console.log('\nOption 1: Install npm packages (then run this script again)');
    console.log('  npm install @emulatorjs/emulatorjs @emulatorjs/cores');
    console.log('\nOption 2: Manual download (Recommended)');
    console.log('  1. Download from: https://github.com/EmulatorJS/EmulatorJS/releases/latest');
    console.log('  2. Extract the "data" folder to: apps/web/public/emulatorjs/data/');
    console.log('  3. Copy loader.js to: apps/web/public/emulatorjs/loader.js');
    console.log('\nOption 3: Use CDN (for development)');
    console.log('  Update EmulatorPlayer.tsx to use:');
    console.log('  EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";');
    // Don't exit with error - allow the install to continue
    return;
  }
  
  // Debug: List package contents
  if (process.env.DEBUG) {
    if (emulatorjsPackage) {
      listPackageContents(emulatorjsPackage, '@emulatorjs/emulatorjs');
    }
    if (coresPackage) {
      listPackageContents(coresPackage, '@emulatorjs/cores');
    }
  }
  
  // If packages aren't found, skip the rest
  if (!emulatorjsPackage && !coresPackage) {
    return;
  }
  
  // Ensure public/emulatorjs directory exists
  ensureDir(publicDir);
  ensureDir(path.join(publicDir, 'data'));
  
  try {
    let loaderFound = false;
    let dataFound = false;
    let coresFound = false;
    
    // Copy loader.js from emulatorjs package
    // The package structure may vary, so we'll check common locations
    if (!emulatorjsPackage) {
      console.warn('Skipping loader.js copy - package not found');
    } else {
      const possibleLoaderPaths = [
        path.join(emulatorjsPackage, 'loader.js'),
        path.join(emulatorjsPackage, 'data', 'loader.js'),
        path.join(emulatorjsPackage, 'dist', 'loader.js'),
        path.join(emulatorjsPackage, 'lib', 'loader.js')
      ];
      for (const loaderPath of possibleLoaderPaths) {
        if (fs.existsSync(loaderPath)) {
          copyFile(loaderPath, path.join(publicDir, 'loader.js'));
          console.log('✓ Copied loader.js');
          loaderFound = true;
          break;
        }
      }
      
      if (!loaderFound) {
        console.warn('Warning: loader.js not found in @emulatorjs/emulatorjs package');
        if (process.env.DEBUG) {
          console.warn('Checked paths:');
          possibleLoaderPaths.forEach(p => {
            console.warn(`  - ${p} (${fs.existsSync(p) ? 'exists' : 'missing'})`);
          });
        }
      }
    }
    
    // Copy data directory from emulatorjs package
    if (emulatorjsPackage) {
      const possibleDataPaths = [
        path.join(emulatorjsPackage, 'data'),
        path.join(emulatorjsPackage, 'dist', 'data'),
        path.join(emulatorjsPackage, 'lib', 'data')
      ];
    
      for (const dataPath of possibleDataPaths) {
        if (fs.existsSync(dataPath)) {
          const destDataPath = path.join(publicDir, 'data');
          copyDir(dataPath, destDataPath);
          console.log('✓ Copied data directory');
          dataFound = true;
          break;
        }
      }
      
      if (!dataFound) {
        // Try copying the entire package if data folder structure is different
        console.log('Attempting to copy entire emulatorjs package structure...');
        try {
          const packageFiles = fs.readdirSync(emulatorjsPackage, { withFileTypes: true });
          for (const entry of packageFiles) {
            const srcPath = path.join(emulatorjsPackage, entry.name);
            const destPath = path.join(publicDir, entry.name);
            
            if (entry.isDirectory() && entry.name === 'data') {
              copyDir(srcPath, destPath);
              console.log('✓ Copied data directory');
              dataFound = true;
            } else if (entry.isFile() && entry.name === 'loader.js') {
              copyFile(srcPath, destPath);
              console.log('✓ Copied loader.js');
              loaderFound = true;
            }
          }
        } catch (error) {
          console.warn(`Error reading package directory: ${error.message}`);
        }
      }
    } else {
      console.warn('Skipping data directory copy - package not found');
    }
    
    if (!dataFound && emulatorjsPackage) {
      console.warn('Warning: data directory not found in @emulatorjs/emulatorjs package');
      if (process.env.DEBUG) {
        const possibleDataPaths = [
          path.join(emulatorjsPackage, 'data'),
          path.join(emulatorjsPackage, 'dist', 'data'),
          path.join(emulatorjsPackage, 'lib', 'data')
        ];
        console.warn('Checked paths:');
        possibleDataPaths.forEach(p => {
          console.warn(`  - ${p} (${fs.existsSync(p) ? 'exists' : 'missing'})`);
        });
      }
      console.warn('\nThe @emulatorjs/emulatorjs npm package may not include the data files.');
      console.warn('You may need to download EmulatorJS manually from:');
      console.warn('  https://github.com/EmulatorJS/EmulatorJS/releases/latest');
      console.warn('  or use the CDN: https://cdn.emulatorjs.org/stable/data/');
    }
    
    // Copy cores from @emulatorjs/cores package
    if (coresPackage) {
      const possibleCoresPaths = [
        path.join(coresPackage, 'cores'),
        path.join(coresPackage, 'data', 'cores'),
        path.join(coresPackage, 'dist', 'cores'),
        path.join(coresPackage, 'lib', 'cores')
      ];
      
      for (const coresPath of possibleCoresPaths) {
        if (fs.existsSync(coresPath)) {
          const destCoresPath = path.join(publicDir, 'data', 'cores');
          ensureDir(destCoresPath);
          copyDir(coresPath, destCoresPath);
          console.log('✓ Copied cores directory');
          coresFound = true;
          break;
        }
      }
      
      if (!coresFound) {
        // Try to find cores in the package root
        const coresDestPath = path.join(publicDir, 'data', 'cores');
        ensureDir(coresDestPath);
        
        try {
          const packageEntries = fs.readdirSync(coresPackage, { withFileTypes: true });
          for (const entry of packageEntries) {
            if (entry.isFile() && entry.name.endsWith('.data')) {
              copyFile(
                path.join(coresPackage, entry.name),
                path.join(coresDestPath, entry.name)
              );
            }
          }
          
          if (fs.existsSync(coresDestPath) && fs.readdirSync(coresDestPath).length > 0) {
            console.log('✓ Copied core files');
            coresFound = true;
          }
        } catch (error) {
          // Ignore errors
        }
      }
      
      if (!coresFound && process.env.DEBUG) {
        console.warn('Warning: Cores not found in @emulatorjs/cores package');
        console.warn('Checked paths:');
        possibleCoresPaths.forEach(p => {
          console.warn(`  - ${p} (${fs.existsSync(p) ? 'exists' : 'missing'})`);
        });
      }
    } else {
      console.warn('Skipping cores copy - package not found');
    }
    
    // Check if files already exist (maybe from manual download)
    const existingLoader = fs.existsSync(path.join(publicDir, 'loader.js')) || 
                          fs.existsSync(path.join(publicDir, 'data', 'loader.js'));
    const existingData = fs.existsSync(path.join(publicDir, 'data', 'emulator.min.js')) ||
                         fs.existsSync(path.join(publicDir, 'data', 'emulator.js'));
    const existingCores = fs.existsSync(path.join(publicDir, 'data', 'cores')) &&
                         fs.readdirSync(path.join(publicDir, 'data', 'cores')).length > 0;
    
    if (loaderFound && dataFound && coresFound) {
      console.log('\n✓ EmulatorJS setup complete!');
    } else if (existingLoader && existingData) {
      console.log('\n✓ EmulatorJS files found (may have been manually installed)');
      if (!existingCores) {
        console.warn('⚠ Warning: Core files may be missing. Ensure cores are in public/emulatorjs/data/cores/');
      }
    } else {
      console.log('\n⚠ EmulatorJS setup incomplete - some files are missing.');
      console.log('\nTo fix this, you have two options:');
      console.log('\nOption 1: Download from GitHub (Recommended)');
      console.log('  1. Download from: https://github.com/EmulatorJS/EmulatorJS/releases/latest');
      console.log('  2. Extract the "data" folder to: apps/web/public/emulatorjs/data/');
      console.log('  3. Copy loader.js to: apps/web/public/emulatorjs/loader.js');
      console.log('\nOption 2: Use CDN (for development)');
      console.log('  Update EmulatorPlayer.tsx to use:');
      console.log('  EJS_pathtodata = "https://cdn.emulatorjs.org/stable/data/";');
      console.log('\nRun with DEBUG=1 for more details: DEBUG=1 npm run setup:emulatorjs');
      // Don't exit with error - allow manual setup
    }
    
  } catch (error) {
    console.error('Error setting up EmulatorJS:', error);
    console.error('This is non-fatal - you can set up EmulatorJS manually if needed.');
    // Don't exit with error code - allow npm install to succeed
    // The user can run the script manually later or use CDN/manual installation
  }
}

main();


