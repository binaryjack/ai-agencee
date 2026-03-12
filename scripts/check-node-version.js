#!/usr/bin/env node
/**
 * Check Node.js version compatibility for better-sqlite3
 * 
 * better-sqlite3 requires Node.js with available prebuilt binaries
 * or a C++ build toolchain.
 */

const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split('.')[0]);

console.log(`Current Node.js version: ${nodeVersion}`);
console.log(`Major version: ${major}`);

if (major >= 24) {
  console.log(`
⚠️  WARNING: Node.js v${major} is too new for better-sqlite3 prebuilt binaries.

RECOMMENDED SOLUTIONS:
1. Use Node.js v22 LTS (recommended):
   - Install nvm-windows: https://github.com/coreybutler/nvm-windows
   - Run: nvm install 22
   - Run: nvm use 22
   - Run: pnpm install

2. Install Visual Studio Build Tools to compile from source:
   - Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Select "Desktop development with C++"
   - Run: pnpm rebuild better-sqlite3

For now, the code-assistant feature requires one of these solutions.
`);
  process.exit(1);
} else if (major >= 20) {
  console.log('✅ Node.js version is compatible with better-sqlite3');
  process.exit(0);
} else {
  console.log('⚠️  Node.js version is too old. Please upgrade to v20 or later.');
  process.exit(1);
}
