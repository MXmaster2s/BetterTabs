# BetterTabs

A Chrome extension that puts every open tab in Chrome's side panel and organises them so you can find the one you want. Click the toolbar icon and the panel opens on the right, staying open while you browse.

Nothing leaves your browser. There is no server, account or analytics.

## Features

**Organise**
- **Sites** (the default) groups tabs by website, busiest first, each site in its own colour. Chrome's own pages and local files get their own folders at the end.
- **Windows**, **Recent** and **Groups** show the same tabs by window, by when you last used them (last hour, earlier today, this week, older), or by Chrome tab group with Chrome's group colours.
- Folders collapse, and BetterTabs remembers which ones you collapsed and which view you chose.
- Pinned and playing tabs are labelled.

**Find**
- Search by name, page title or address as you type.
- **Show current tab**: the target button next to the search box scrolls the list to the tab you're on. It clears a search or expands a folder if either is hiding it.
- Click any tab to switch to it, even if it's in another window.

**Rename**
- Right-click a tab and choose **Edit name** (or select it and press `F2`) to give it a name you'll recognise. Renamed tabs are badged, and **Reset name** brings the original back. Names last until Chrome closes.

**Clean up**
- Tabs with exactly the same address are marked **Duplicate**. **Close duplicates** keeps one copy of each, preferring the tab you're looking at.
- Close a tab with its × button, or close every tab in a folder with **Close all**. Closing happens straight away, and Chrome's **Reopen closed tab** (`Ctrl/Cmd+Shift+T`) undoes it.

**Comfortable**
- Updates live as you open, close and switch tabs.
- Works with the keyboard alone, with screen readers, in light and dark mode, in high-contrast mode, and with Chrome's font-size setting.

See [CHANGELOG.md](CHANGELOG.md) for what changed in each version. The current version is in [manifest.json](manifest.json).

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
| `F2` | Rename the tab (or right-click it and choose **Edit name**) |
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

Issues and pull requests are welcome. Run `node dev/check.mjs` first and keep the no-build, no-dependency rule. When you add or change a feature, update the **Features** list above, `docs/SPEC.md` and `CHANGELOG.md` in the same pull request.

## License

[MIT](LICENSE)
