# Chrome Web Store listing

Copy these into the Chrome Web Store Developer Dashboard. The live listing is <https://chromewebstore.google.com/detail/bettertabs/gghmnehinhdlfcppjgaaokgiloppniep>. Keep this file in step with `extension/manifest.json`: `node scripts/check.mjs` fails if a permission has no justification here.

## Name

BetterTabs: Side Panel Tab Manager

The Store shows the `name` from `extension/manifest.json`, so change it there (75 characters at most). "Tab Manager" and "Side Panel" are the phrases people search for; the brand stays first. See [store-seo.md](store-seo.md) for why.

## Summary (132 characters max)

Tab manager in Chrome's side panel: group tabs by site, search, suspend and save them. Private, no account.

The Store shows the `description` from `extension/manifest.json` as the summary. Keep the two the same.

## Single purpose

Show and organise the user's open tabs in a side panel.

## Description

Paste as plain text; the Store does not render formatting. The first two sentences are what search results and Google show, so they carry the main phrases.

```
BetterTabs is a better tab manager for Chrome. It lists every open tab, from every window, in the side panel, grouped by website, so you can find the one you want even with hundreds open.

Built for too many tabs, including the ones AI assistants and browser agents open while they research for you. Search them, group them, suspend them to free memory, close duplicates, and save a set of tabs to open again later.

WHAT YOU CAN DO
• See your tabs by site, by window, by when you last used them, or by Chrome tab group
• Search tabs by title or address as you type (Alt+Shift+F opens the panel with search ready), and find closed pages from your Chrome history
• Close duplicate tabs in one click, keeping the one you are on
• Select several tabs, then close, suspend or group them together
• Group all of a site's tabs into one Chrome tab group in one click
• Suspend tabs you are not using to free memory; they stay in the list and reload when you click them
• Save tabs as a named list and open it again later, or save a list as a bookmarks file
• Favourite a tab, or a whole site, and keep it one click away, even after you close it
• Rename any tab so you recognise it
• Recent tabs are kept for you automatically, so a crash or a restart does not lose your tabs: reopen them from the Restore screen
• Save a backup of your favourites, lists, names and settings to one file you keep, and restore it after a reinstall
• The list keeps its order while you work, so rows never move under your mouse; Tidy up sorts it again when you want
• Jump to the tab you are on, switch to a tab in another window, use it with the keyboard, in light and dark mode

PRIVATE BY DESIGN
No account, no server, no analytics. BetterTabs has no host permissions, so it cannot read or change the pages you visit. It is open source (MIT): github.com/MXmaster2s/BetterTabs

WHY DOES CHROME SAY "READ AND CHANGE YOUR BROWSING HISTORY"?
Chrome shows that warning for extensions that can see tab titles and addresses or search your history. BetterTabs uses tabs only to draw your tab list, and your history only to find a page when you search for a tab that is not open. It never changes your history, and nothing leaves your computer.

IF CHROME SAYS "PROCEED WITH CAUTION"
People who use Enhanced Safe Browsing see that message for any extension from a new developer. BetterTabs has no host permissions and makes no network requests, and its code is open for anyone to read.

WHAT'S NEW IN 1.7
Select mode, saved lists, Group this site, recent tabs kept automatically, a backup file for everything you save, favourites that stay after you close the tab (and for a whole site), search that also finds pages in your Chrome history, a list that holds still while tabs change, a redone Settings page with shortcuts written for your computer, and a tooltip on every button.
```

## Permission justifications

### `tabs`

Needed to read each tab's title and address so the list can show, search and group them, to switch to a tab, and to close tabs the user asks to close.

### `tabGroups`

Needed to read the names and colours of the user's Chrome tab groups for the Groups view.

### `sidePanel`

Needed to show the tab list in Chrome's side panel, and to open it when the toolbar icon is clicked.

### `storage`

Needed to remember the selected view, which folders the user collapsed and their settings, the names the user gives their tabs, the pages the user favourites, and the lists of tabs the user saves by name. Everything is saved locally in the browser. Names are filed under a short hash of the page address, never the address, so they come back when the page is open again after a restart. A favourite keeps the page's title and address until the user removes it, so its icon stays after the tab is closed and a click can open the page again. A saved list keeps the title and address of each tab the user put in it until the user deletes the list. It also keeps copies of the open tabs' titles and addresses there automatically (about half a day's worth), so they can be reopened after a crash. The user can delete them from the panel.

### `history`

Needed so that when the user searches for a tab that is not open, BetterTabs can list matching pages from Chrome's history and open one in a new tab when clicked. History is read only to answer that search; it is not stored, copied or transmitted.

### `favicon`

Needed to show each site's icon next to its tabs, using Chrome's own favicon cache.

## Host permissions

None. The extension does not read or change page content.

## Remote code

No. All code ships inside the extension package.

## Data usage

- Collects: nothing. Tab titles and addresses are read to display them and are never transmitted. Names the user types are saved under a hash of the page address. What is kept is what the user chooses to keep: each page they favourite and each list of tabs they save (the titles and addresses, on the user's own computer, until the user removes them). The titles and addresses of the open tabs are also kept automatically as recent tabs, for about half a day, on the user's own computer (Chrome's local extension storage, never synced), until the user deletes them. When the user searches, matching pages from Chrome's history are shown for that search and not kept. On the Web Store's privacy tab, this is web history that is stored locally and never transmitted.
- Sells or transfers user data: no.
- Uses data for anything unrelated to the single purpose: no.

## Privacy policy

BetterTabs does not collect, share or transmit personal data. The tab titles and web addresses it reads stay in your browser and are used only to show your tab list, and to keep your recent tabs. The only things saved are your chosen view, the folders you collapsed, your settings, the names you give tabs and your favourite pages, kept locally with Chrome's extension storage. Names are filed under a short hash of the page address, not the address itself, so they come back when the same page is open after a restart. A favourite keeps its title and address until you remove it, so it stays after you close the tab, and a list you save keeps the title and address of each tab in it until you delete the list. It also keeps copies of the titles and addresses of your open tabs on your computer automatically, for about half a day, so you can reopen them after a crash; they are never sent anywhere, and you can delete them from the panel. There is no account, server or analytics. Clicking "Add to longbook" on a billing or price page opens the longbook app on your Mac with the site's name; if it is not installed, a link to longbook.app opens only if you click it. A setting turns the button off.
