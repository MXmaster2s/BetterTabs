// Assembles the website into dist/site: `node scripts/build-site.mjs`.
// The demo on the home page is the real panel, so the extension and the preview page
// are copied next to the site's own pages. No dependencies.

import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'site');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, 'site'), out, { recursive: true });
cpSync(join(root, 'extension'), join(out, 'extension'), { recursive: true });
cpSync(join(root, 'preview'), join(out, 'preview'), { recursive: true });
console.log('✓ dist/site (serve it with: python3 -m http.server 8742 --directory dist/site)');
