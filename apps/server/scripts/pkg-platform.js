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
  'darwin': 'node18-macos-x64',
  'linux': 'node18-linux-x64'
};

let targets;

if (isCI && platform === 'linux') {
  // In CI on Linux, build for all platforms
  targets = 'node18-win-x64,node18-macos-x64,node18-linux-x64';
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
  console.log('\nBuild completed successfully!');
  console.log(`Artifacts saved to: ${outputDir}`);
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

