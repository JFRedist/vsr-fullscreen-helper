// Builds dist/vsr-fullscreen-helper-<version>.zip for the Chrome Web Store: node tools/pack.js
// Uses bsdtar (the Windows System32 tar.exe, or `tar` elsewhere), which writes zip entries with forward slashes.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const { version } = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const out = path.join(root, 'dist', `vsr-fullscreen-helper-${version}.zip`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });

const files = ['manifest.json', 'background.js', 'content.js', '_locales', 'icons'];
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', out, ...files], { cwd: root, stdio: 'inherit' });
console.log('wrote', out);
