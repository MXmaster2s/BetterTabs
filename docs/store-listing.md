# Chrome Web Store listing

Copy these into the Chrome Web Store Developer Dashboard. Keep this file in step with `extension/manifest.json`: `node scripts/check.mjs` fails if a permission has no justification here.

## Name

BetterTabs

## Summary (132 characters max)

See all your open tabs in Chrome's side panel, grouped by website, with search and one-click cleanup.

## Single purpose

Show and organise the user's open tabs in a side panel.

## Description

BetterTabs puts every open tab, from every window, in Chrome's side panel and organises them so you can find the one you want.

- Sites: tabs grouped by website, busiest first.
- Windows, Recent and Groups: the same tabs by window, by when you last used them, or by Chrome tab group.
- Search by title or address.
- Rename any tab: right-click it and choose Edit name.
- Favourite a tab: right-click it and choose Add to favourites. Its site icon sits above the search box, one click away.
- One button scrolls the list to the tab you're on.
- Duplicate tabs are marked, and one click closes the extra copies.
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

Needed to remember the selected view and which folders the user collapsed, and to hold the names the user gives their tabs and the tabs they favourite while Chrome is open. The view and folders are saved locally; names and favourites stay in memory only.

### `favicon`

Needed to show each site's icon next to its tabs, using Chrome's own favicon cache.

## Host permissions

None. The extension does not read or change page content.

## Remote code

No. All code ships inside the extension package.

## Data usage

- Collects: nothing. Tab titles and addresses are read to display them and are not stored or transmitted.
- Sells or transfers user data: no.
- Uses data for anything unrelated to the single purpose: no.

## Privacy policy

BetterTabs does not collect, store, share or transmit personal data. The tab titles and web addresses it reads stay in your browser and are used only to show your tab list. The only things saved are your chosen view and the folders you collapsed, kept locally with Chrome's extension storage. Names you give your tabs and the tabs you favourite are held in memory until Chrome closes. There is no account, server or analytics.
