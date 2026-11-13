# BetterTabs

Every open tab, from every window, in Chrome's side panel, grouped by website.

Click the toolbar icon and the panel opens on the right and stays open while you browse. Nothing leaves your browser: there is no server, account or analytics.

It is built for heavy tab use, including the hundreds of tabs that AI assistants and browser agents open while they research for you. One list shows them all grouped by site; you can search them, suspend them to free memory, and close them in bulk. BetterTabs does not connect to any AI: it shows what Chrome has open.

## Install

**From the Chrome Web Store (recommended):** open the [BetterTabs page](https://chromewebstore.google.com/detail/bettertabs/gghmnehinhdlfcppjgaaokgiloppniep) and click **Add to Chrome**. Chrome keeps it up to date. Chrome 121 or later.

**From the source** (to read or change the code): there is no build step.

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
- Search by name, page title or address as you type. `Alt+Shift+F` opens the panel with the search box ready. Pages you closed are found too: matches from your Chrome history appear under the open tabs, and a click opens one.
- **Show current tab**: the target button next to the search box scrolls the list to the tab you're on. It clears a search or expands a folder if either is hiding it.
- Click any tab to switch to it, even if it's in another window.

**Favourites**
- Right-click a site's folder (Sites view) and choose **Add site to favourites** to keep a whole site: its icon stays lit while any page on the site is open, so it does not go dim when a page changes address, and a click opens the site's home page if nothing is open.
- Right-click a tab and choose **Add to favourites**. Its site icon appears in a row above the search box, and one click takes you to that tab, even in another window. Clicking it also scrolls the list to that tab. Closing the tab does not remove the favourite: its icon stays, faded with a dashed edge, and a click opens the page again. Right-click the icon and choose **Remove from favourites** to take it off. Favourite tabs are badged in the list. A favourite keeps the page's title and address on your computer until you remove it.

**longbook**
- On a billing or price page (`/pricing`, `/billing`, `/plans`, `/subscription` and the like), a Mac shows an **Add to longbook** button on that tab's row, and the right-click menu has the same item. It opens the Add Commitment screen of the [longbook](https://longbook.app) app with the site's name filled in, ready for you to fill the rest and save. If you don't have the app yet, **Get longbook** in the right-click menu opens longbook.app. A setting turns the button off. BetterTabs decides from the address alone and never reads the page.

**Rename**
- Right-click a tab and choose **Edit name** (or select it and press `F2`) to give it a name you'll recognise. Renamed tabs are badged, and **Reset name** brings the original back. Names come back when the same page is open after you restart Chrome, and with **Reopen closed tab**.

**Clean up**
- Tabs with exactly the same address are marked **Duplicate**. **Close duplicates** keeps one copy of each, preferring the tab you're looking at.
- **Select** (a button beside the tab count, or Ctrl or Cmd-click a tab) lets you tick several tabs and then **Close**, **Suspend** or **Group** them together. Each row gets a tick box, Shift-click ticks a range, and **Select all** on a folder ticks every tab shown in it, so a search plus Select all picks everything that matches. **Done** or `Esc` leaves Select mode.
- **Saved lists**: with tabs ticked in Select mode, **Save list** names them and keeps each tab's title and address on your computer (tick **Close these tabs after saving** to clear them away, the way OneTab does). **Saved lists** in the settings shows every list; **Open** puts one into a new window (only the first tab loads, the rest wait, suspended), **Save as file** downloads it as bookmarks, and **Delete** removes it after a second click. Lists stay until you delete them.
- **Group** (on each site's folder, in the Sites view) puts that site's tabs into one Chrome tab group named after the site, one group per window. Pinned tabs are left out, and the button hides once a window's tabs are already together.
- **Suspend** (on each folder, or in the right-click menu) unloads tabs you aren't using to free memory. They stay in the list, marked **Suspended**, and reload when you click them. The tab you're on, pinned tabs and tabs playing sound are left alone.
- Close a tab with its × button, or close every tab in a folder with **Close all**. Closing happens straight away, and Chrome's **Reopen closed tab** (`Ctrl/Cmd+Shift+T`) undoes it.

**Settings**
- The icon button at the bottom right opens the settings: hide the **Add to longbook** button, and choose which view the panel opens in (the one you used last, or always Sites, Windows, Recent or Groups). Settings are saved on your computer and take effect at once.
- **Save backup to a file** keeps your favourites, saved lists, tab names, settings and recent tabs in one file you choose to keep. It survives removing or reinstalling BetterTabs: **Restore from a file** brings it all back and deletes nothing you have now.
- **Recent tabs** are kept for you automatically: BetterTabs keeps a copy of your open tabs' titles and addresses on your computer, a new one about every five minutes while your tabs change, every copy of the last hour, then one an hour for about half a day. **Restore from a file** also lists them: **Restore** opens each saved window, skips pages you already have open, and loads only the first tab of each window so hundreds of tabs don't load at once, **Save as bookmarks** exports a copy, and **Delete recent tabs** removes them. Nothing leaves your computer.

**Comfortable**
- Updates live as you open, close and switch tabs, without moving the rows you are pointing at: the list keeps its order, and a **Tidy up** button next to Select sorts it afresh when you want.
- Hover any button or tab for a tooltip that says what it does and which key does the same, including the shortcuts you set in Chrome.
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
| `Alt+Shift+B` | Open the panel from anywhere in Chrome |
| `Alt+Shift+F` | Open the panel with the search box focused |

The two `Alt+Shift` shortcuts are Chrome extension shortcuts: change them at `chrome://extensions/shortcuts`.

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
| [`site/`](site) | The landing page. Its live demo is the real panel on fake tabs. |
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
node scripts/build-site.mjs        # dist/site, the landing page (see docs/site.md)
python3 scripts/make-icons.py      # redraw the toolbar icons
```

## Documentation

| Read | For |
| --- | --- |
| [AGENTS.md](AGENTS.md) | The rules and file map for agents and people changing the code |
| [docs/SPEC.md](docs/SPEC.md) | Everything BetterTabs does, precisely enough to rebuild it |
| [docs/site.md](docs/site.md) | The landing page: how to view, update and publish it |
| [docs/research/](docs/research) | Competitor research, traffic, search phrases and Reddit complaints, with the data |
| [docs/scripts.md](docs/scripts.md) | What each command checks or changes |
| [docs/RELEASING.md](docs/RELEASING.md) | Cutting a release and submitting to the Chrome Web Store |
| [docs/store-listing.md](docs/store-listing.md) | Store text, privacy policy and a justification for each permission |
| [docs/store-seo.md](docs/store-seo.md) | How to be found on the Chrome Web Store: search phrases, name, images |
| [CHANGELOG.md](CHANGELOG.md) | What changed in each version |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to propose and submit a change |

## Roadmap

What other tab managers do that BetterTabs does not do yet, easiest first (also on [bettertabs.fyi](https://bettertabs.fyi/#roadmap)):

- **Next:** drag to reorder and move between windows; close idle tabs automatically; an Edge listing and a check in Edge and Brave.
- **Later:** workspaces; notes on tabs; a warning when you open a duplicate; a tree view.
- **Not planned:** syncing between devices, because it would send your tab list off your computer.

## Contributing

Issues and pull requests are welcome; start with [CONTRIBUTING.md](CONTRIBUTING.md). Keep the no-build, no-dependency rule, and update the docs in the same pull request.

## Credits

The competitor research and lead generation behind the roadmap were done with [Lighteningly](https://lighteningly.com/?utm_source=bettertabs&utm_medium=github&utm_campaign=research-credit), which finds and summarises the conversations where people ask for a tool like this.

## License

[MIT](LICENSE)
