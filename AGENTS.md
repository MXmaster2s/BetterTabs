# AGENTS.md

This repository is **BetterTabs**: a Chrome extension (Manifest V3) that opens in Chrome's side panel and lists every open tab, grouped by website. Your job is to install it, change it, or rebuild a variant of it, and to prove the result works.

## Start here, every session

1. Read this file fully.
2. Find out which of these the owner wants:
   - **Install it** in their Chrome: see [Install in Chrome](#install-in-chrome).
   - **Change it**: read the rules below, then [Build and test](#build-and-test).
   - **Rebuild it from scratch** as their own variant: read [docs/SPEC.md](docs/SPEC.md); it is precise enough to build from.
3. Before you edit, run `git status` and `git log --oneline -10`.
4. Read a file under `docs/` only when the work needs it: `docs/RELEASING.md` for a release, `docs/scripts.md` for what each command does.

## Hard rules

1. No build step, bundler, framework, package manager or runtime dependency. The `extension/` folder is exactly what Chrome loads.
2. Plain JavaScript (ES2022), HTML and CSS. Keep the code readable without tooling.
3. No network requests, analytics or remote code. Everything stays in the browser.
4. Request the fewest permissions possible, and no `host_permissions` or content scripts: the extension never reads page content. Every permission in `extension/manifest.json` needs a usage pattern in `scripts/check.mjs` and a justification in `docs/store-listing.md`; the check fails if they drift apart.
5. Closing tabs is immediate by design (no confirmation dialog). Do not add one.
6. Don't store tab titles or URLs. Only the chosen view and collapsed folders are saved to disk (`chrome.storage.local`); names the user types and favourited tabs are kept in memory only (`chrome.storage.session`), keyed by tab id.
7. CSS sizes use `rem`/`em`, not `px`, so the panel follows the user's font-size setting. Interactive targets are at least 24 CSS px (`--target`), focus rings use `:focus-visible`, and state is never shown by colour alone.
8. Don't assign page-controlled strings (tab titles, URLs) to `innerHTML`. Build DOM with the `h()` helper in `extension/sidepanel.js`.
9. **Every new or changed feature updates the docs in the same change** (see [Docs go with the code](#docs-go-with-the-code)).
10. Confirm before anything that reaches outside this folder or can't be undone: pushing, tagging, publishing a release, uploading to the Web Store, deleting branches.
11. Verify with the checks and the preview page, and in real Chrome when the change touches Chrome APIs. Do not say a change is done before all three have passed.

## Build and test

```bash
node scripts/check.mjs             # manifest, syntax, permissions, changelog, docs. Node 18+
python3 -m http.server 8741        # then open http://localhost:8741/preview/
node scripts/package.mjs           # dist/bettertabs-<version>.zip (only for a release)
```

### 1. Static checks

`node scripts/check.mjs` must print `✓`. CI runs the same command.

### 2. See the panel with fake tabs

Open <http://localhost:8741/preview/> at a narrow width (about 380 px) in light and dark mode. The preview loads the real `extension/sidepanel.*` files and replaces `chrome.*` with `preview/mock-chrome.js`.

Check: every view (Sites, Windows, Recent, Groups), search, collapse and expand, closing a tab, **Close duplicates**, renaming (right-click, `F2`, `Enter`, `Esc`, reset), favourites (add, click the icon, remove, close the tab), **Show current tab**, keyboard use (`/`, arrows, `Enter`, `Delete`), and the console for errors.

Two preview quirks: some automated browsers don't send a real `contextmenu` event on right-click (dispatch one with `new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY })`), and a hidden browser pane pauses smooth scrolling, so stub `matchMedia('(prefers-reduced-motion: reduce)')` to test scroll position.

If you add a Chrome API call, add the matching fake to `preview/mock-chrome.js`.

### 3. Try it in real Chrome

The mock cannot prove real behaviour: favicons, tab groups, window focus and live updates only work in Chrome. Load the extension as described below and exercise the change by hand, or drive Chrome with [Chrome DevTools for agents](https://developer.chrome.com/docs/extensions/ai/build-with-ai), which can install, reload and inspect extensions and their side panel:

```bash
npx chrome-devtools-mcp@latest --categoryExtensions --autoConnect
```

Optional: Chrome publishes a skill with current extension APIs and best practices. Install it into your agent and pick `chrome-extensions` and `modern-web-guidance`:

```bash
npx modern-web-guidance@latest install --choose
```

## Install in Chrome

Chrome only loads unpacked extensions through its own UI, so a person (or a browser-driving tool) has to do these steps:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension` folder (the one containing `manifest.json`), not the repository root.
4. Pin **BetterTabs** from the puzzle-piece menu, then click its icon. The panel opens on the right.

Requires Chrome 121 or later. After editing any file, click the reload arrow on the extension's card, then reopen the panel.

## Where things are

| Path | What |
| --- | --- |
| `extension/manifest.json` | Declares the side panel, toolbar icon, permissions and the version. |
| `extension/background.js` | Service worker. One job: open the side panel when the toolbar icon is clicked. |
| `extension/sidepanel.html` | Panel markup: search, view switch, count, list, context menu. |
| `extension/sidepanel.css` | All styling. Light and dark, high contrast, reduced motion. |
| `extension/sidepanel.js` | All panel logic. See the map below. |
| `extension/icons/` | Toolbar icons. Redraw with `python3 scripts/make-icons.py`. |
| `docs/SPEC.md` | Full behaviour spec, precise enough to rebuild the extension. |
| `docs/store-listing.md` | Store text, privacy policy and a justification for each permission. |
| `docs/RELEASING.md` | How to cut a release and submit it to the Chrome Web Store. |
| `docs/scripts.md` | What each command checks or changes. |
| `site/` | The landing page (`site/index.html`, `site/privacy.html`, `site/assets/`). Its demo is the real panel. See `docs/site.md`. |
| `scripts/check.mjs` | Dependency-free checks. Run before every commit. |
| `scripts/package.mjs` | Builds the Web Store zip from `extension/`. |
| `scripts/build-site.mjs` | Assembles `dist/site` (site, extension and preview) for viewing or publishing. |
| `preview/` | The real panel in a normal browser tab, with fake tabs. |
| `CHANGELOG.md` | One entry per version, newest first. |

### `sidepanel.js` map

Reading Chrome → organising → drawing → acting → wiring, in that order in the file.

- `load()` reads tabs, tab groups and the current window, then calls `render()`. `refresh()` is the debounced, visibility-aware way to call it.
- `bySite`, `byWindow`, `byRecent`, `byGroup` each turn a tab list into folders `{ key, label, colour?, icon?, tabs }`. `foldersFor()` picks one by `state.view`.
- `render()` filters by the search query, then draws folders (`renderFolder`) and rows (`renderTab`).
- `findDuplicates()` fills `state.duplicates` and `state.extraCopies`.
- `closeTabs`, `activate`, `toggle`, `setView`, `setQuery` are the user actions.
- `startEdit` / `finishEdit` rename a tab inline; `toggleFavourite` and `renderFavourites` handle the icon row above the search box; `openMenu` shows the right-click menu (a `popover`); `showCurrentTab` scrolls to the active tab; `isBillingPage`, `serviceName` and `addToLongbook` handle the Add to longbook button.
- State that survives restarts (`view`, `collapsed`) lives in `chrome.storage.local`. Custom tab names and favourite tab ids live in `chrome.storage.session`.

## Conventions

- Match the surrounding code: two-space indent, single quotes, semicolons, early returns, short comments that say why.
- Group colours for sites are derived from the hostname (`hueOf`). Tab group colours come from Chrome (`GROUP_COLOURS`).
- Copy is plain, sentence case, active voice ("Close all", "Search tabs"). Errors say what happened and how to fix it.
- Write commit messages as a short imperative sentence about what changed ("Add tab renaming"), the way the existing history does.
- When you add or remove a permission, update `extension/manifest.json`, `scripts/check.mjs`, `docs/store-listing.md` and `docs/SPEC.md` together.
- Don't add a build system, TypeScript or a UI framework.

## Docs go with the code

A change is not finished until a reader of GitHub would learn about it. In the same change:

- `README.md`: the **Features** list, and the **Keyboard** table if keys changed. It is what people read first, so it must describe what the extension does today.
- `docs/SPEC.md`: the behaviour, precisely.
- `docs/store-listing.md`: the description, when users see the difference.
- `site/index.html`: the feature cards, FAQ and permission lines, and the JSON-LD `softwareVersion`; `site/privacy.html` if the privacy story changes.
- `extension/manifest.json` `version` and `CHANGELOG.md`: bump for any user-visible change and add a line under the same version.

`node scripts/check.mjs` fails if `CHANGELOG.md` has no entry for the manifest version, if a document links to or names a file that doesn't exist, or if a permission has no justification. It cannot tell whether the Features list is accurate; that part is yours.
