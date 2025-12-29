#!/usr/bin/env node

/**
 * Platform-aware pkg script
 * Builds for current platform when running locally, all platforms in CI
 */

const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const platform = os.platform();
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

// Map Node.js platform to pkg target
const platformMap = {
  'win32': 'node18-win-x64',
  'darwin': 'node18-macos-arm64',
  'linux': 'node18-linux-x64'
};

let targets;

if (isCI && platform === 'linux') {
  // In CI on Linux, build for all platforms
  targets = 'node18-win-x64,node18-macos-arm64,node18-linux-x64';
} else {
  // Local builds: only current platform
  const target = platformMap[platform];
  if (!target) {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }
  targets = target;
  console.log(`Building for current platform: ${target}`);
}

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, '..', '..', '..', 'release', 'bundle');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Build with pkg - it will create jacare-linux, jacare-macos, jacare-win.exe
const command = `pkg dist/index.js --targets ${targets} --output ${path.join(outputDir, 'jacare')}`;

try {
  execSync(command, { stdio: 'inherit', cwd: __dirname + '/..' });
  
  // Normalize filenames to match expected format
  if (isCI && platform === 'linux') {
    // Multi-platform build: rename files to expected format
    const renameMap = {
      'jacare-linux-x64': 'jacare-linux',
      'jacare-win-x64.exe': 'jacare-win.exe',
      'jacare-macos-arm64': 'jacare-macos'
    };
    
    for (const [pkgName, expectedName] of Object.entries(renameMap)) {
      const pkgPath = path.join(outputDir, pkgName);
      const expectedPath = path.join(outputDir, expectedName);
      if (fs.existsSync(pkgPath)) {
        console.log(`Renaming ${pkgName} to ${expectedName}`);
        fs.renameSync(pkgPath, expectedPath);
      }
    }
  } else {
    // Single-platform build: ensure consistent naming
    const expectedName = platform === 'win32' ? 'jacare-win.exe' :
                         platform === 'darwin' ? 'jacare-macos' :
                         'jacare-linux';
    const expectedPath = path.join(outputDir, expectedName);
    
    // Check what pkg actually created
    const possibleNames = [
      'jacare',
      'jacare.exe',
      'jacare-macos',
      'jacare-linux',
      'jacare-win.exe',
      'jacare-linux-x64',
      'jacare-win-x64.exe',
      'jacare-macos-arm64'
    ];
    
    let foundFile = null;
    for (const name of possibleNames) {
      const filePath = path.join(outputDir, name);
      if (fs.existsSync(filePath)) {
        foundFile = filePath;
        break;
      }
    }
    
    if (foundFile && foundFile !== expectedPath) {
      console.log(`Renaming ${path.basename(foundFile)} to ${expectedName}`);
      fs.renameSync(foundFile, expectedPath);
    }
  }
  
  console.log('\nBuild completed successfully!');
  console.log(`Artifacts saved to: ${outputDir}`);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

