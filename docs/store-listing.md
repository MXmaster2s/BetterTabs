# Chrome Web Store listing

Copy these into the Chrome Web Store Developer Dashboard. Keep this file in step with `extension/manifest.json`: `node scripts/check.mjs` fails if a permission has no justification here.

## Name

BetterTabs

## Summary (132 characters max)

See all your open tabs in Chrome's side panel, grouped by website, with search and one-click cleanup.

## Single purpose

Show and organise the user's open tabs in a side panel.

## Description

BetterTabs puts every open tab, from every window, in Chrome's side panel and organises them so you can find the one you want. It is built for heavy tab use, including the hundreds of tabs that AI assistants and browser agents open while they work: group them by site, search them, suspend them and close them in bulk.

- Sites: tabs grouped by website, busiest first.
- Windows, Recent and Groups: the same tabs by window, by when you last used them, or by Chrome tab group.
- Search by title or address.
- Rename any tab: right-click it and choose Edit name. Names come back after you restart Chrome.
- On a billing or price page (Mac), "Add to longbook" opens the longbook app's Add Commitment screen with the site's name filled in.
- Favourite a tab: right-click it and choose Add to favourites. Its site icon sits above the search box, one click away, and stays there after you close the tab so you can open the page again.
- Hover any button for a tooltip that says what it does and which key does the same.
- One button scrolls the list to the tab you're on.
- Duplicate tabs are marked, and one click closes the extra copies.
- Suspend tabs you are not using to free memory. They stay in the list and reload when you click them.
- Export every open tab to a file you keep, to open in any browser or import as bookmarks.
- Keyboard shortcuts: Alt+Shift+B opens the panel, Alt+Shift+F opens it with search ready.
- Click a tab to switch to it, even in another window. Close one tab, or every tab on a site, in one click.
- Updates as you browse. Works with the keyboard and in light and dark mode.

BetterTabs has no account and no server. It never sends anything anywhere.

## Permission justifications

### `tabs`

Needed to read each tab's title and address so the list can show, search and group them, to switch to a tab, and to close tabs the user asks to close.

### `tabGroups`

Needed to read the names and colours of the user's Chrome tab groups for the Groups view.

### `sidePanel`

Needed to show the tab list in Chrome's side panel, and to open it when the toolbar icon is clicked.

### `storage`

Needed to remember the selected view, which folders the user collapsed and their settings, the names the user gives their tabs, and the pages the user favourites. Everything is saved locally in the browser. Names are filed under a short hash of the page address, never the address, so they come back when the page is open again after a restart. A favourite keeps the page's title and address until the user removes it, so its icon stays after the tab is closed and a click can open the page again. If the user turns on the optional automatic backups setting (off by default), it also keeps copies of the open tabs' titles and addresses there, so they can be restored after a crash. Turning the setting off deletes them.

### `favicon`

Needed to show each site's icon next to its tabs, using Chrome's own favicon cache.

## Host permissions

None. The extension does not read or change page content.

## Remote code

No. All code ships inside the extension package.

## Data usage

- Collects: nothing. Tab titles and addresses are read to display them and are never transmitted. By default they are not stored either: names the user types are saved under a hash of the page address. The one thing kept is each page the user chooses to favourite (its title and address, on the user's own computer, until the user removes it). Only if the user turns on the optional automatic backups setting are the titles and addresses of the open tabs kept, on the user's own computer (Chrome's local extension storage, never synced), until the user turns the setting off or deletes the backups. On the Web Store's privacy tab, this is web history that is stored locally and never transmitted.
- Sells or transfers user data: no.
- Uses data for anything unrelated to the single purpose: no.

## Privacy policy

BetterTabs does not collect, share or transmit personal data. The tab titles and web addresses it reads stay in your browser and are used only to show your tab list, and to make backups if you turn that setting on. The only things saved are your chosen view, the folders you collapsed, your settings, the names you give tabs and your favourite pages, kept locally with Chrome's extension storage. Names are filed under a short hash of the page address, not the address itself, so they come back when the same page is open after a restart. A favourite keeps its title and address until you remove it, so it stays after you close the tab. If you turn on automatic backups, which are off by default, it also keeps copies of the titles and addresses of your open tabs on your computer, so you can restore them after a crash; they are never sent anywhere, and turning the setting off deletes them. There is no account, server or analytics. Clicking "Add to longbook" on a billing or price page opens the longbook app on your Mac with the site's name; if it is not installed, a link to longbook.app opens only if you click it. A setting turns the button off.
