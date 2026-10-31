# Instructions for coding agents

BetterTabs is a Chrome extension (Manifest V3). It opens in Chrome's side panel and lists every open tab, grouped by website. This file tells you how to install, change and verify it. Read it fully before editing.

## Goal of a typical session

One of these:

1. **Install it** in the user's Chrome. See [Install](#install-in-chrome).
2. **Change it** and prove the change works. See [Verify](#verify-your-work).
3. **Rebuild it from scratch** from [docs/SPEC.md](docs/SPEC.md) if the user wants their own variant.

## Hard constraints

- No build step, bundler, framework, package manager or runtime dependency. The folder you see is the folder Chrome loads.
- Plain JavaScript (ES2022), HTML and CSS. Keep the code readable without tooling.
- No network requests, analytics or remote code. Everything stays in the browser.
- Request the fewest permissions possible. Every permission in `manifest.json` needs a justification in `CHROMEWEBSTORE.md`; `node dev/check.mjs` fails if they drift apart.
- Closing tabs is immediate by design (no confirmation dialog). Do not add one.
- Sizes in CSS use `rem`/`em`, not `px`, so the panel follows the user's font-size setting.
- Interactive targets are at least 24 CSS px (`--target`), focus rings use `:focus-visible`, and state is never shown by colour alone.

## Files

| File | What it does |
| --- | --- |
| `manifest.json` | Extension manifest. Declares the side panel, toolbar icon and permissions. |
| `background.js` | Service worker. One job: open the side panel when the toolbar icon is clicked. |
| `sidepanel.html` | Panel markup: search box, view switch, tab count, list container. |
| `sidepanel.css` | All styling. Light and dark mode, high-contrast mode, reduced motion. |
| `sidepanel.js` | All panel logic. See the map below. |
| `icons/` | Toolbar icons. Regenerate with `python3 dev/make-icons.py`. |
| `CHROMEWEBSTORE.md` | Store listing text and a justification for each permission. |
| `docs/SPEC.md` | Full behaviour spec, precise enough to rebuild the extension. |
| `dev/check.mjs` | Dependency-free sanity checks. Run before every commit. |
| `dev/preview.html` | Opens the real panel in a normal browser tab using fake tabs. |
| `dev/mock-chrome.js` | The fake `chrome.*` APIs used by the preview. |

### `sidepanel.js` map

Reading Chrome → organising → drawing → acting → wiring, in that order in the file.

- `load()` reads tabs, tab groups and the current window, then calls `render()`. `refresh()` is the debounced, visibility-aware way to call it.
- `bySite`, `byWindow`, `byRecent`, `byGroup` each turn a tab list into folders `{ key, label, colour?, icon?, tabs }`. `foldersFor()` picks one by `state.view`.
- `render()` filters by the search query, then draws folders (`renderFolder`) and rows (`renderTab`).
- `findDuplicates()` fills `state.duplicates` and `state.extraCopies`.
- `closeTabs`, `activate`, `toggle`, `setView`, `setQuery` are the user actions.
- `startEdit` / `finishEdit` rename a tab inline; `openMenu` shows the right-click menu (a `popover`); `showCurrentTab` scrolls to the active tab.
- State that survives restarts (`view`, `collapsed`) lives in `chrome.storage.local`. Custom tab names live in `chrome.storage.session` (memory only, gone when Chrome closes).

## Install in Chrome

Chrome only loads unpacked extensions through its own UI, so a person (or a browser-driving tool) has to do these steps:

1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the repository folder (the one containing `manifest.json`).
4. Pin **BetterTabs** from the puzzle-piece menu, then click its icon. The panel opens on the right.

Requires Chrome 121 or later (side panel API plus `tab.lastAccessed`).

After editing any file, click the reload arrow on the extension's card, then reopen the panel.

## Verify your work

Do all three before you say a change is done.

### 1. Static checks

```bash
node dev/check.mjs
```

Needs Node 18 or later. Checks the manifest, script syntax and permission usage.

### 2. See the panel with fake tabs

```bash
python3 -m http.server 8741
```

Open `http://localhost:8741/dev/preview.html` at a narrow width (about 380 px wide) in light and dark mode. The preview loads the real `sidepanel.*` files and replaces `chrome.*` with `dev/mock-chrome.js`.

Check: every view (Sites, Windows, Recent, Groups), search, collapse and expand, closing a tab, "Close duplicates", renaming (right-click, `F2`, `Enter`, `Esc`, reset), the "Show current tab" button, keyboard use (`/`, arrows, `Enter`, `Delete`), and the console for errors.

Two preview quirks: some automated browsers don't send a real `contextmenu` event on right-click (dispatch one with `new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX, clientY })`), and a hidden browser pane pauses smooth scrolling, so stub `matchMedia('(prefers-reduced-motion: reduce)')` to test scroll position.

If you add a Chrome API call, add the matching fake to `dev/mock-chrome.js`.

### 3. Try it in real Chrome (when the change touches Chrome APIs)

The mock cannot prove real behaviour: favicons, tab groups, window focus and live updates only work in Chrome. Load the extension as described above and exercise the change by hand, or drive Chrome with [Chrome DevTools for agents](https://developer.chrome.com/docs/extensions/ai/build-with-ai), which can install, reload and inspect extensions and their side panel:

```bash
npx chrome-devtools-mcp@latest --categoryExtensions --autoConnect
```

## Optional: Chrome's extension guidance for agents

The Chrome team publishes a skill with current extension APIs and best practices. Install it into your agent with the wizard, and pick `chrome-extensions` and `modern-web-guidance`:

```bash
npx modern-web-guidance@latest install --choose
```

## Conventions

- Match the surrounding code: two-space indent, single quotes, semicolons, early returns, short comments that say why.
- Build DOM with the `h()` helper in `sidepanel.js`. Do not assign untrusted strings to `innerHTML`; tab titles and URLs are page-controlled.
- Group colours for sites are derived from the hostname (`hueOf`). Tab group colours come from Chrome (`GROUP_COLOURS`).
- Copy is plain, sentence case, active voice ("Close all", "Search tabs"). Errors say what happened and how to fix it.
- When you add or remove a permission, update `manifest.json`, `CHROMEWEBSTORE.md` and `docs/SPEC.md` together.
- Bump `version` in `manifest.json` for any user-visible change, and add a line to `CHANGELOG.md`.

## Things to leave alone

- Don't add a build system, TypeScript or a UI framework.
- Don't add `host_permissions` or content scripts. The extension never reads page content.
- Don't store tab titles or URLs anywhere. Only the chosen view and collapsed folders are saved to disk; names the user types are kept in memory only (`storage.session`), keyed by tab id, and dropped when the tab closes.
