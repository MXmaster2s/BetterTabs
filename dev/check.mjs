// Sanity checks for the extension. No dependencies: run `node dev/check.mjs`.
//   - manifest.json parses and every file it points to exists
//   - every script is valid JavaScript
//   - every permission is used, and every chrome.* API that needs one is requested

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (message) => problems.push(message);

const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));

if (manifest.manifest_version !== 3) fail('manifest_version must be 3');

// Files the manifest references
const referenced = [
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);
for (const file of new Set(referenced)) {
  if (!existsSync(join(root, file))) fail(`manifest.json points to ${file}, which does not exist`);
}

// Scripts parse
const scripts = ['background.js', 'sidepanel.js', 'dev/preview.js', 'dev/mock-chrome.js'];
for (const file of scripts) {
  try {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file} has a syntax error:\n${error.stderr}`);
  }
}

// Permissions line up with the code
const code = ['background.js', 'sidepanel.js'].map((file) => readFileSync(join(root, file), 'utf8')).join('\n');
const usage = {
  tabs: /chrome\.tabs\b/,
  tabGroups: /chrome\.tabGroups\b/,
  sidePanel: /chrome\.sidePanel\b/,
  storage: /chrome\.storage\b/,
  favicon: /_favicon/,
};
const requested = new Set(manifest.permissions ?? []);
for (const [permission, pattern] of Object.entries(usage)) {
  const used = pattern.test(code);
  if (used && !requested.has(permission)) fail(`code uses ${permission} but manifest.json does not request it`);
  if (!used && requested.has(permission)) fail(`manifest.json requests ${permission} but no code uses it`);
}
for (const permission of requested) {
  if (!(permission in usage)) fail(`permission ${permission} has no usage check in dev/check.mjs`);
}

// Every permission needs a store justification
const store = readFileSync(join(root, 'CHROMEWEBSTORE.md'), 'utf8');
for (const permission of requested) {
  if (!store.includes(`\`${permission}\``)) fail(`CHROMEWEBSTORE.md has no justification for ${permission}`);
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log(`✓ manifest, ${scripts.length} scripts and ${requested.size} permissions check out`);
