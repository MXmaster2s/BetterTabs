// Sanity checks for the extension and its docs. No dependencies: run `node scripts/check.mjs`.
//   - extension/manifest.json parses and every file it points to exists
//   - every script is valid JavaScript
//   - every permission is used, and every chrome.* API that needs one is requested
//   - the changelog and the store listing cover the current version and permissions
//   - every file a document links to or names in `code` exists, so the docs cannot drift

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extension = join(root, 'extension');
const problems = [];
const fail = (message) => problems.push(message);
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');

const manifest = JSON.parse(read('extension', 'manifest.json'));

if (manifest.manifest_version !== 3) fail('manifest_version must be 3');

// Files the manifest references
const referenced = [
  manifest.background?.service_worker,
  manifest.side_panel?.default_path,
  ...Object.values(manifest.icons ?? {}),
  ...Object.values(manifest.action?.default_icon ?? {}),
].filter(Boolean);
for (const file of new Set(referenced)) {
  if (!existsSync(join(extension, file))) fail(`extension/manifest.json points to ${file}, which does not exist`);
}

// Scripts parse
const scripts = [
  'extension/background.js',
  'extension/sidepanel.js',
  'preview/preview.js',
  'preview/mock-chrome.js',
  'scripts/check.mjs',
  'scripts/package.mjs',
];
for (const file of scripts) {
  try {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    fail(`${file} has a syntax error:\n${error.stderr}`);
  }
}

// Permissions line up with the code
const code = ['background.js', 'sidepanel.js'].map((file) => readFileSync(join(extension, file), 'utf8')).join('\n');
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
  if (!(permission in usage)) fail(`permission ${permission} has no usage check in scripts/check.mjs`);
}

// The changelog covers the current version
if (!read('CHANGELOG.md').includes(`## ${manifest.version}\n`)) fail(`CHANGELOG.md has no "## ${manifest.version}" entry`);

// Every permission needs a store justification
const store = read('docs', 'store-listing.md');
for (const permission of requested) {
  if (!store.includes(`\`${permission}\``)) fail(`docs/store-listing.md has no justification for ${permission}`);
}

// Documents only mention files that exist
const SKIP = new Set(['.git', 'node_modules', 'dist']);
const files = [];
(function walk(folder) {
  for (const name of readdirSync(folder)) {
    if (SKIP.has(name)) continue;
    const path = join(folder, name);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(relative(root, path));
  }
})(root);
const paths = new Set(files);
const names = new Set(files.map((file) => basename(file)));
const folders = new Set(files.flatMap((file) => file.split('/').slice(0, -1).map((_, i, parts) => parts.slice(0, i + 1).join('/'))));
// Mentioned before they exist: `node scripts/package.mjs` creates dist/.
const CREATED_LATER = /^dist(\/|$)/;
const FILE_LIKE = /\.(md|mdc|json|js|mjs|py|html|css|png|yml|yaml)$/;

const documents = files.filter((file) => file.endsWith('.md') || file.endsWith('.mdc'));
for (const document of documents) {
  const text = read(document);
  const here = dirname(document);

  // [text](relative/link) must resolve from the document's own folder
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const resolved = join(here, target.split('#')[0]).replace(/\/$/, '');
    if (resolved && !paths.has(resolved) && !folders.has(resolved)) fail(`${document} links to ${target}, which does not exist`);
  }

  // `path/to/file.ext` and `file.ext` in code spans must exist somewhere in the repository
  const prose = text.replace(/```.*?```/gs, '');
  for (const [, span] of prose.matchAll(/`([^`\n]+)`/g)) {
    if (!/^[\w.\-/]+$/.test(span) || !/\w/.test(span) || CREATED_LATER.test(span)) continue;
    if (span.includes('/') && !span.startsWith('/')) {
      const path = span.replace(/\/$/, '');
      if (!paths.has(path) && !folders.has(path)) fail(`${document} mentions ${span}, which does not exist`);
    } else if (FILE_LIKE.test(span) && !span.startsWith('.') && !span.includes('/') && !names.has(span)) {
      fail(`${document} mentions ${span}, which does not exist`);
    }
  }
}

// Every pointer file sends agents to AGENTS.md
for (const pointer of ['.github/copilot-instructions.md', '.cursor/rules/bettertabs.mdc']) {
  if (!existsSync(join(root, pointer))) fail(`${pointer} is missing`);
  else if (!read(pointer).includes('AGENTS.md')) fail(`${pointer} does not point to AGENTS.md`);
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log(
  `✓ manifest, ${scripts.length} scripts, ${requested.size} permissions and ${documents.length} documents check out`,
);
