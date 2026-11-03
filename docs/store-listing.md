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
- Rename any tab: right-click it and choose Edit name. Names and favourites come back after you restart Chrome.
- On a billing or price page (Mac), "Add to longbook" opens the longbook app's Add Commitment screen with the site's name filled in.
- Favourite a tab: right-click it and choose Add to favourites. Its site icon sits above the search box, one click away.
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

Needed to remember the selected view, which folders the user collapsed and their settings, and the names the user gives their tabs and the tabs they favourite. Everything is saved locally in the browser. Names and favourites are filed under a short hash of the page address, never the address, so they come back when the page is open again after a restart.

### `favicon`

Needed to show each site's icon next to its tabs, using Chrome's own favicon cache.

## Host permissions

None. The extension does not read or change page content.

## Remote code

No. All code ships inside the extension package.

## Data usage

- Collects: nothing. Tab titles and addresses are read to display them and are not transmitted. They are not stored either: names the user types and favourites are saved under a hash of the page address.
- Sells or transfers user data: no.
- Uses data for anything unrelated to the single purpose: no.

## Privacy policy

BetterTabs does not collect, store, share or transmit personal data. The tab titles and web addresses it reads stay in your browser and are used only to show your tab list. The only things saved are your chosen view, the folders you collapsed, your settings, the names you give tabs and your favourite tabs, kept locally with Chrome's extension storage. Names and favourites are filed under a short hash of the page address, not the address itself, so they come back when the same page is open after a restart. There is no account, server or analytics. Clicking "Add to longbook" on a billing or price page opens the longbook app on your Mac with the site's name; if it is not installed, a link to longbook.app opens only if you click it. A setting turns the button off.
