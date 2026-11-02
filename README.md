# BetterTabs

Every open tab, from every window, in Chrome's side panel, grouped by website.

Click the toolbar icon and the panel opens on the right and stays open while you browse. Nothing leaves your browser: there is no server, account or analytics.

## Install

No build step. Chrome 121 or later.

1. Download this repository (**Code → Download ZIP**, then unzip it) or clone it.
2. Open `chrome://extensions` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and choose the `extension` folder inside the repository.
4. Pin BetterTabs from the puzzle-piece menu, then click its icon.

After changing a file, click the reload arrow on the extension's card.

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

**Favourites**
- Right-click a tab and choose **Add to favourites**. Its site icon appears in a row above the search box, and one click takes you to that tab, even in another window. Right-click the icon and choose **Remove from favourites**, or close the tab, to take it off. Favourite tabs are badged in the list, and favourites last until Chrome closes.

**Rename**
- Right-click a tab and choose **Edit name** (or select it and press `F2`) to give it a name you'll recognise. Renamed tabs are badged, and **Reset name** brings the original back. Names last until Chrome closes.

**Clean up**
- Tabs with exactly the same address are marked **Duplicate**. **Close duplicates** keeps one copy of each, preferring the tab you're looking at.
- Close a tab with its × button, or close every tab in a folder with **Close all**. Closing happens straight away, and Chrome's **Reopen closed tab** (`Ctrl/Cmd+Shift+T`) undoes it.

**Comfortable**
- Updates live as you open, close and switch tabs.
- Works with the keyboard alone, with screen readers, in light and dark mode, in high-contrast mode, and with Chrome's font-size setting.

### Keyboard

| Key | Action |
| --- | --- |
| `/` | Focus the search box |
| `Esc` | Clear the search |
| `↓` / `↑` | Move through tabs |
| `Enter` | Switch to the tab (from search: the first match) |
| `F2` | Rename the tab (or right-click it and choose **Edit name**) |
| `Delete` | Close the tab |

## Work on it with your coding agent

The repository is written so an agent can install, change and verify the extension without help from you.

1. Clone the repository and open the folder in the tool you code with: an agent in your editor or terminal.
2. Say what you want. If your tool does not pick up the instructions by itself, tell it: "read AGENTS.md".

For example:

> Read AGENTS.md, then load the extension into my Chrome and confirm the side panel opens.

> Read AGENTS.md. Add a "Pinned" view that lists only pinned tabs. Follow the repo's conventions and update the docs.

> Read docs/SPEC.md. Build a Chrome side panel extension that behaves as described, but organise tabs by &lt;your idea&gt; instead of by website.

The agent works through the rules in [AGENTS.md](AGENTS.md), proves its change with the checks and the preview page, and updates the docs in the same change. Only real Chrome shows favicons, tab groups and live updates; for that, [Chrome DevTools for agents](https://developer.chrome.com/docs/extensions/ai/build-with-ai) lets an agent install, reload and inspect an extension in a running Chrome.

## What is inside

| | |
| --- | --- |
| [`extension/`](extension) | The extension: manifest, service worker, side panel page, styles, logic and icons. This is the folder Chrome loads and the Web Store zip is made from. |
| [`docs/`](docs) | The behaviour spec, the store listing, the release steps and the scripts reference. |
| [`scripts/`](scripts) | The checks, the zip builder and the icon drawing script. No dependencies. |
| [`preview/`](preview) | The real panel in an ordinary browser tab, with fake tabs and a fake `chrome.*`. |
| [`.github/`](.github) | CI, issue and pull request templates, and the Copilot pointer to `AGENTS.md`. |

## Requirements

- Chrome 121 or later (side panel API and `tab.lastAccessed`).
- To work on it: Node.js 18 or later for the checks; Python 3 for the preview server and the icon script. Nothing to install.

## By hand

```bash
node scripts/check.mjs             # manifest, syntax, permissions, changelog and docs
python3 -m http.server 8741        # then open http://localhost:8741/preview/
node scripts/package.mjs           # dist/bettertabs-<version>.zip for the Web Store
python3 scripts/make-icons.py      # redraw the toolbar icons
```

## Documentation

| Read | For |
| --- | --- |
| [AGENTS.md](AGENTS.md) | The rules and file map for agents and people changing the code |
| [docs/SPEC.md](docs/SPEC.md) | Everything BetterTabs does, precisely enough to rebuild it |
| [docs/scripts.md](docs/scripts.md) | What each command checks or changes |
| [docs/RELEASING.md](docs/RELEASING.md) | Cutting a release and submitting to the Chrome Web Store |
| [docs/store-listing.md](docs/store-listing.md) | Store text, privacy policy and a justification for each permission |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to propose and submit a change |

## Contributing

Issues and pull requests are welcome; start with [CONTRIBUTING.md](CONTRIBUTING.md). Keep the no-build, no-dependency rule, and update the docs in the same pull request.

## License

[MIT](LICENSE)
