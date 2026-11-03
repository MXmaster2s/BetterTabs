# Scripts

Everything here is dependency-free and changes nothing outside this folder. Run them from the repository root.

| Command | When | What it changes |
| --- | --- | --- |
| `node scripts/check.mjs` | before every commit; CI runs it on every push and pull request | nothing |
| `python3 -m http.server 8741` | to try the panel with fake tabs at <http://localhost:8741/preview/> | nothing |
| `node scripts/package.mjs` | to build the zip for the Chrome Web Store | writes `dist/bettertabs-<version>.zip` |
| `node scripts/build-site.mjs` | to look at or publish the website (see [site.md](site.md)) | writes `dist/site/` |
| `python3 scripts/make-icons.py` | when the toolbar icon design changes | `extension/icons/` (copy `icon128.png` to `site/assets/icon.png` afterwards) |

## check.mjs

Exits 0 when everything passes and 1 with one `✗` line per problem. It checks:

- `extension/manifest.json` is Manifest V3 and every file it names exists.
- Every script parses (`node --check`).
- Every permission is used by the code, and every `chrome.*` API the code calls is requested.
- Every keyboard shortcut in the manifest is handled by `extension/background.js`.
- `CHANGELOG.md` has an entry for the manifest's version.
- `docs/store-listing.md` justifies every permission.
- Every relative link in a document resolves, and every file path written in `code` in a document exists. Renaming or deleting a file without updating the docs fails the check.
- The website's links resolve, its icon matches the extension's, and its JSON-LD version matches the manifest.
- The Cursor and Copilot pointer files still send agents to `AGENTS.md`.

Adding a permission means adding a usage pattern to `scripts/check.mjs`; the check tells you when one is missing.

## package.mjs

Zips the contents of `extension/` (not the docs, scripts or preview) with Node's built-in zlib. The zip is reproducible: the same files give the same bytes. `dist/` is ignored by git.

## The preview page

`preview/index.html` builds the real `extension/sidepanel.*` files into an ordinary browser tab and replaces `chrome.*` with the fake in `preview/mock-chrome.js`. It is a fast way to look at layout, themes and keyboard use. It cannot prove favicons, tab groups, window focus or live updates; use real Chrome for those.
