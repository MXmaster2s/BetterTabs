# BetterTabs

A Chrome extension that shows all your open tabs in the side panel, grouped by website.

- **Sites** groups tabs by website, busiest first. **Windows**, **Recent** and **Groups** organise the same tabs by window, by when you last used them, or by Chrome tab group.
- Search by title or address.
- Tabs with exactly the same address are marked **Duplicate**, and **Close duplicates** keeps one copy of each.
- Click a tab to switch to it, even in another window. Close one tab, or every tab on a site, in one click. Closing happens straight away.
- Updates live as you browse. Keyboard friendly, with light, dark and high-contrast modes.

Nothing leaves your browser. There is no server, account or analytics.

## Install

No build step. Chrome 121 or later.

1. Download this repository (**Code → Download ZIP**, then unzip it) or clone it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the folder that contains `manifest.json`.
4. Pin BetterTabs from the puzzle-piece menu, then click its icon. The panel opens on the right.

After changing a file, click the reload arrow on the extension's card.

## Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus the search box |
| `Esc` | Clear the search |
| `↓` / `↑` | Move through tabs |
| `Enter` | Switch to the tab (from search: the first match) |
| `Delete` | Close the tab |

## Build it with your coding agent

This repository is written so an agent can install, change and verify the extension without help from you. Point your agent at the repo and give it a prompt like one of these.

Install it:

> Read AGENTS.md in this repository, then load the extension into my Chrome and confirm the side panel opens.

Change it:

> Read AGENTS.md. Add a "Pinned" view that lists only pinned tabs. Follow the repo's conventions, update docs/SPEC.md, and verify with `node dev/check.mjs` and the preview page.

Make your own version:

> Read docs/SPEC.md. Build a Chrome side panel extension that behaves as described, but organise tabs by <your idea> instead of by website.

What the agent gets:

| File | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Constraints, file map, install steps and how to verify a change |
| [docs/SPEC.md](docs/SPEC.md) | Complete behaviour spec, enough to rebuild from scratch |
| [dev/check.mjs](dev/check.mjs) | Dependency-free checks for the manifest, scripts and permissions |
| [dev/preview.html](dev/preview.html) | The real panel in an ordinary browser tab, using fake tabs |
| [CHROMEWEBSTORE.md](CHROMEWEBSTORE.md) | Store listing text and a justification for every permission |

The preview and checks are quick, but only real Chrome shows favicons, tab groups and live updates. For that, [Chrome DevTools for agents](https://developer.chrome.com/docs/extensions/ai/build-with-ai) lets an agent install, reload and inspect an extension in a running Chrome.

## Develop

```bash
node dev/check.mjs                 # manifest, syntax and permission checks
python3 -m http.server 8741        # then open http://localhost:8741/dev/preview.html
python3 dev/make-icons.py          # redraw the toolbar icons
```

## Project layout

```
manifest.json       extension manifest (Manifest V3)
background.js       opens the side panel when the icon is clicked
sidepanel.html      panel markup
sidepanel.css       panel styles
sidepanel.js        panel logic
icons/              toolbar icons
docs/SPEC.md        behaviour spec
dev/                checks, preview page, mock Chrome APIs, icon script
```

## Contributing

Issues and pull requests are welcome. Run `node dev/check.mjs` first, keep the no-build, no-dependency rule, and update `docs/SPEC.md` when behaviour changes.

## License

[MIT](LICENSE)
