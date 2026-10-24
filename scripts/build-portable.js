#!/usr/bin/env node
/**
 * Builds a PORTABLE bundle of the emulator.
 *
 * Output goes to dist-portable/ — a small, self-contained folder you can zip
 * and copy to any machine that has Node.js installed. No node_modules, no
 * TypeScript build, no clone of the repo required on the target.
 *
 * Folder contents:
 *   6502-emulator            — launcher script (chmod +x, runs with node)
 *   emulator.cjs             — the whole emulator bundled into one JS file
 *   fake6502_addon.node      — the native CPU core (loaded at runtime)
 *   config/                  — default config + BIOS so it runs out of the box
 *   README.txt               — short usage notes
 *
 * Usage on the target machine:
 *   unzip, install Node (https://nodejs.org), then:
 *     ./6502-emulator                         # loads default config
 *     ./6502-emulator -l config/other.json    # loads a specific config
 *
 * Requirements on the BUILD machine: the project must be built first
 * (npm run build) so the native addon exists. esbuild is used to bundle.
 *
 * Note: fake6502_addon.node is native and OS/arch-specific. Build on (or for)
 * the same platform family you intend to run on. socat is still needed on the
 * target for the live serial terminal (brew/apt install socat); without it the
 * ACIA falls back to stdout.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dist-portable');
const bundlePath = path.join(outDir, 'emulator.cjs');
const addonSrc = path.join(root, 'build', 'Release', 'fake6502_addon.node');

function run(cmd, args) {
  console.log('> ' + cmd + ' ' + args.join(' '));
  execFileSync(cmd, args, { stdio: 'inherit' });
}

// 0. Sanity check: native addon must exist
if (!fs.existsSync(addonSrc)) {
  console.error('Native addon not found at ' + addonSrc);
  console.error('Run "npm run build" first.');
  process.exit(1);
}

// 1. Fresh output dir
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

// 2. Bundle all TypeScript + pure-JS deps (js-yaml) into one CJS file.
//    The native addon is kept external and loaded from disk at runtime.
console.log('\n=== Bundling with esbuild ===');
run(path.join(root, 'node_modules', '.bin', 'esbuild'), [
  path.join(root, 'src', 'cli.ts'),
  '--bundle',
  '--platform=node',
  '--format=cjs',
  '--target=node18',
  '--external:*.node',
  '--minify',
  '--outfile=' + bundlePath,
]);

// 3. Copy the native addon next to the bundle
console.log('=== Copying native addon ===');
fs.copyFileSync(addonSrc, path.join(outDir, 'fake6502_addon.node'));

// 4. Copy default config + BIOS files so it runs out of the box
console.log('=== Copying default config ===');
const cfgOut = path.join(outDir, 'config');
fs.mkdirSync(cfgOut, { recursive: true });
const cfgSrc = path.join(root, 'bin', 'config');
for (const f of fs.readdirSync(cfgSrc)) {
  if (f.endsWith('.json') || f.endsWith('.bin')) {
    fs.copyFileSync(path.join(cfgSrc, f), path.join(cfgOut, f));
  }
}

// 5. Write the launcher script
console.log('=== Writing launcher ===');
const launcher = `#!/usr/bin/env node
/*
 * 6502/65C02 Emulator — portable launcher
 * Runs the bundled emulator. The native addon (fake6502_addon.node) and the
 * config/ folder must stay in the same directory as this script.
 */
'use strict';
const path = require('path');
const scriptDir = __dirname;

// Tell the bundle where to find the native addon (next to this launcher)
process.env.FAKE6502_ADDON = path.join(scriptDir, 'fake6502_addon.node');

// Resolve relative config paths (e.g. in a -l flag) against the launch dir,
// matching the behaviour of the repo launcher.
process.env.EMU_LAUNCH_DIR = process.cwd();

// Default config shipped alongside this launcher
process.env.EMU_DEFAULT_CONFIG = path.join(scriptDir, 'config', 'simple6502-config.json');

const emu = require(path.join(scriptDir, 'emulator.cjs'));
// The bundle exports main(); call it explicitly since require.main !== module here.
if (typeof emu.main === 'function') {
  emu.main().catch((err) => { console.error('CLI error:', err); process.exit(1); });
}
`;
const launcherPath = path.join(outDir, '6502-emulator');
fs.writeFileSync(launcherPath, launcher);
fs.chmodSync(launcherPath, 0o755);

// 6. Write a short README for the bundle
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const readme = `6502/65C02 Homebrew Computer Emulator v${pkg.version} — Portable Build
======================================================================

This folder is self-contained. To run the emulator you only need Node.js
installed (https://nodejs.org). No npm install, no build step.

Run:
  ./6502-emulator                       Load the default config
  ./6502-emulator -l config/<file>      Load a specific config
  ./6502-emulator --help                Show options

Folder contents:
  6502-emulator          Launcher (run this)
  emulator.cjs           Bundled emulator code
  fake6502_addon.node    Native CPU core (must stay next to the launcher)
  config/                Default configuration and ROM/BIOS files

Serial terminal:
  For the live serial terminal, install socat:
    macOS:  brew install socat
    Linux:  apt install socat
  Without socat, serial output falls back to stdout.

Note: fake6502_addon.node is compiled for a specific OS/CPU architecture.
This build runs on the same platform it was built on. For a different
platform, rebuild there (clone the repo, npm install, npm run build:portable).
`;
fs.writeFileSync(path.join(outDir, 'README.txt'), readme);

// 7. Report size
function dirSize(dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    total += f.isDirectory() ? dirSize(p) : fs.statSync(p).size;
  }
  return total;
}
const kb = Math.round(dirSize(outDir) / 1024);
console.log('\n✅ Portable build complete: ' + outDir + ' (' + kb + ' KB)');

// 8. Create a distributable zip named with version + platform + arch, since
//    the bundled native addon only runs on the platform it was built on.
const os = require('os');
const platMap = { darwin: 'macos', linux: 'linux', win32: 'windows' };
const plat = platMap[os.platform()] || os.platform();
const zipName = `6502-emulator-v${pkg.version}-${plat}-${os.arch()}.zip`;
const zipPath = path.join(root, zipName);
try {
  fs.rmSync(zipPath, { force: true });
  // Zip the folder's contents under a top-level dir named after the zip stem.
  const stem = zipName.replace(/\.zip$/, '');
  const stemDir = path.join(root, stem);
  fs.rmSync(stemDir, { recursive: true, force: true });
  fs.cpSync(outDir, stemDir, { recursive: true });
  execFileSync('zip', ['-r', '-q', zipName, stem], { cwd: root });
  fs.rmSync(stemDir, { recursive: true, force: true });
  const zipKb = Math.round(fs.statSync(zipPath).size / 1024);
  console.log('📦 Distributable zip: ' + zipName + ' (' + zipKb + ' KB)');
} catch (e) {
  console.warn('Could not create zip (' + e.message + '); the folder is still usable.');
}

console.log('   Zip the folder and copy it anywhere with Node installed.');
console.log('   Run:  ./dist-portable/6502-emulator');
