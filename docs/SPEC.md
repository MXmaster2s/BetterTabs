# BetterTabs specification

This document describes what BetterTabs does precisely enough to rebuild it from nothing. The source in this repository is the reference implementation.

## Purpose

Chrome's tab strip gets unreadable past a dozen tabs. BetterTabs lists every open tab, from every window, in a side panel, organised so you can find one quickly.

Single purpose: show and organise your open tabs.

## Platform

- Chrome 121 or later, Manifest V3.
- Plain JavaScript, HTML and CSS. No build step. No dependencies.
- Permissions: `tabs`, `tabGroups`, `sidePanel`, `storage`, `favicon`. Nothing else, no host permissions.

## Pieces

1. **Service worker** (`extension/background.js`): calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` so clicking the toolbar icon opens the panel.
2. **Side panel page** (`extension/sidepanel.html`, `.css`, `.js`): everything the user sees.

## Layout of the panel

From top to bottom:

1. A visually hidden `<h1>` "Open tabs".
2. A row of favourite icons (see Favourites), shown only when there is at least one favourite.
3. A row with a search box (`type="search"`, label "Search tabs") and, to its right, a square icon button (a target symbol) labelled **Show current tab**.
4. A four-way view switch (radio group): **Sites**, **Windows**, **Recent**, **Groups**.
5. A summary row: the tab count on the left; on the right, a "Close N duplicates" text button shown only when duplicates exist.
6. The list: a column of folders. Each folder has a header (`<h2>` wrapping a toggle button with the folder name and its tab count, plus a "Close all" button) and a `<ul>` of tab rows.
7. A visually hidden `role="status"` element for screen reader announcements.
8. A context menu (`<div popover role="menu">`) holding **Edit name**, **Reset name** (renamed tabs only) and **Add to favourites** / **Remove from favourites**.

The toolbar (items 1 to 5) stays pinned to the top while the list scrolls.

## Data

- Tabs: `chrome.tabs.query({})` (all windows).
- Tab groups: `chrome.tabGroups.query({})`.
- Current window: `chrome.windows.getCurrent()`.
- Tabs are ordered with the panel's own window first, then other windows by id, and within a window by tab index.

## Views

Every view produces folders. Tabs inside a folder keep the order given by the view.

### Sites (default)

- One folder per hostname, with a leading `www.` removed. `http` and `https` only.
- Other URLs fall into special folders, always listed last: **Chrome pages** (`chrome:`, `chrome-extension:`, `about:`, `edge:`, `devtools:`), **Files on this computer** (`file:`), **Other**.
- Folders are sorted by tab count (most first), then by name.
- Each folder gets a colour derived from a hash of its hostname (`hsl(hash % 360, 62%, 50%)`), shown as a tinted header tab and underline. Special folders are grey.
- The folder header shows the site's favicon.
- Each row's second line shows the URL path (`Home page` when the path is `/`; a trailing `?…` when there is a query string).

### Windows

- One folder per window: **This window** first, then **Window 2**, **Window 3** and so on.
- Row second line: the site name.

### Recent

- Folders by `tab.lastAccessed`: **Last hour**, **Earlier today**, **This week**, **Older**. Empty folders are omitted.
- Tabs sorted by most recently used first.
- Row second line: the site name and how long ago, for example `github.com, 5 min ago`.

### Groups

- One folder per Chrome tab group, named by the group title (**Untitled group** if empty), coloured with Chrome's group colour (grey, blue, red, yellow, green, pink, purple, cyan, orange).
- Tabs outside any group go in **Not in a group**, last.
- Row second line: the site name.

## Tab rows

- A row is a button (switch to the tab) plus a close button.
- Layout: favicon, title, second line (see views) plus badges.
- Favicon: `chrome-extension://<id>/_favicon/?pageUrl=<url>&size=32`. If it fails to load or the URL is not http(s), show a letter tile with the site's first letter.
- Badges on the second line: **Renamed**, **Duplicate**, **Pinned**, **Playing** (`tab.audible`).
- The tab you are looking at (active tab of the panel's window) has `aria-current="true"` and a yellow highlighter background behind its title. In forced-colours mode it gets an outline instead.
- The close button is hidden until the row is hovered or focused. On devices with no hover it is always visible.
- Hovering a row shows a tooltip with the name, the full URL and what a click and `F2` do.

## Behaviour

### Switching

Clicking a row activates the tab (`chrome.tabs.update(id, { active: true })`). If the tab is in another window, that window is focused too (`chrome.windows.update(windowId, { focused: true })`).

### Closing

Immediate, with no confirmation:

- Row × closes one tab.
- A folder's **Close all** closes every tab in that folder (only those currently shown, so a search narrows it).
- **Close N duplicates** closes the extra copies.

After a row is closed, keyboard focus moves to the next row.

### Duplicates

Two tabs are duplicates only if their URLs are exactly equal (including `#` fragments). For each set of duplicates, one copy is kept: the active tab of the panel's window if it is one of them, otherwise the most recently used. The others are the "extra copies" that **Close N duplicates** removes. Every tab in a duplicate set shows the **Duplicate** badge.

### Renaming

- Right-clicking a row (or pressing `F2` on it, or the keyboard context-menu key) opens the context menu at the pointer, kept inside the panel. The first item is focused; `↑`, `↓`, `Home` and `End` move, `Esc` or clicking away closes it and returns focus to the row.
- **Edit name** replaces the row with a text box (max 120 characters) holding the current name, selected, with the original title as placeholder and the hint "Enter to save, Esc to cancel. Empty restores the original."
- `Enter` saves and returns focus to the row. `Esc` cancels. Clicking away saves what was typed. A blank name, or one equal to the page's own title, removes the custom name.
- While the box is open, live tab updates are held back so typing is never redrawn away; they apply once editing ends. `/`, arrows and `Delete` type normally in the box.
- **Reset name** removes the custom name. Both actions are announced ("Name saved", "Original name restored").
- A renamed tab shows the custom name and a **Renamed** badge. Its tooltip also shows the original title. Search matches the custom name, the original title and the URL.
- While Chrome runs, names are kept in `chrome.storage.session`, keyed by tab id: they survive closing the panel and navigating inside the tab, and move with the tab if Chrome replaces its id (suspending can). They are also remembered across restarts (see Remembering).
- **Remembering.** Each `http`, `https` or `file` page address is hashed (SHA-256, first 8 bytes as 16 hex digits). `chrome.storage.local` `remembered.names` maps that hash to the name. A tab whose address hashes to a remembered name, and that has no name of its own, gets that name when the list loads. Entries for pages that are not open are kept. Reset name deletes the entry. At most 300 names are kept, oldest dropped first. Other pages (such as the new tab page, which every new tab shares) are never remembered. The address itself is never stored for a name. (Favourites are different: see below.)
- While a name is being edited, the browser's own context menu (copy, paste) is left alone.

### Favourites

- A favourite is a page, kept by its address: `{ url, title }`. **Add to favourites** in a tab row's context menu adds that tab's page; the same item reads **Remove from favourites** for a page that is already a favourite, and is hidden for tabs with no address and new-tab pages. Favourites are shown in the order they were added, up to 100 (adding more announces "You can have up to 100 favourites").
- Each favourite is a square icon button (the site's favicon, or the letter tile) in a row above the search box. The row wraps and is hidden when empty. The button's accessible name is the tab's name (custom name if it has one); the tooltip shows the name, the address, what a click does ("Favourite: click to go to this tab", or "Favourite, closed: click to open it again") and "Right-click to remove it".
- The tab a favourite stands for is the open tab with exactly that address: the one you are on, else one in this window, else the first. Clicking an icon switches to that tab, as clicking its row does, including focusing its window, and then scrolls the list to its row and pulses it, as **Show current tab** does (clearing a search or expanding a folder if either hides it). If no tab has that address, a click opens the page in a new tab and shows that row. The icon of the tab you are looking at has `aria-current="true"` and the highlighter background (an outline in forced-colours mode).
- Right-clicking an icon (or pressing the context-menu key on it) opens a menu with only **Remove from favourites**. After removing from the row, keyboard focus moves to that tab's row in the list.
- The tab a favourite stands for shows a **Favourite** badge in the list.
- Closing the tab does not remove the favourite. Its icon stays, faded with a dashed border and named "<title>, closed", until the user removes it. While a tab is open, the favourite's stored title follows the tab's name, so a closed favourite shows the last title seen. Navigating a tab to another address makes it stop standing for the favourite.
- Added and removed are announced ("Added to favourites", "Removed from favourites").
- Favourites are stored in `chrome.storage.local` under `favourites`, as an array of `{ url, title }`.

### Group this site

In the Sites view, a folder for a website (not Chrome pages or files) shows **Group** at the right of its header, before **Suspend**, when at least one window has two or more of its unpinned tabs that are not already all in the same tab group. It makes one Chrome tab group per window with `chrome.tabs.group`, holding that window's unpinned tabs from the folder, and titles it with the site name with `chrome.tabGroups.update` (Chrome picks the colour). Pinned tabs are left out, because Chrome cannot group them; a tab that is already in another group moves out of it. The status line says "Grouped N tabs from <site>", or "Chrome would not group these tabs" if every call failed. The folder then shows in the Groups view with Chrome's colour. No permission beyond `tabs` and `tabGroups` is used. Its accessible name is "Group N tabs from <site> into a Chrome tab group".

### Suspending

Chrome keeps a suspended (discarded) tab in the strip and reloads it when it is used. **Suspend** is shown at the right of each folder header (with **Close all**) when the folder has at least one tab that can be suspended, and as **Suspend tab** in a tab's right-click menu. A tab can be suspended unless it is the active tab of its window, already suspended, playing sound, pinned, or not an `http`, `https` or `file` page. The folder button suspends every such tab in the folder through `chrome.tabs.discard`; it is announced "Suspended N tabs", or "Chrome would not suspend these tabs" when Chrome declined. A suspended tab shows a **Suspended** badge. If Chrome gives the tab a new id, its name and favourite place move to it (`chrome.tabs.onReplaced`).

### Add to longbook

[longbook](https://longbook.app) is a Mac and iPhone app for recurring money. This feature hands a billing or price page to its Add Commitment screen.

- **Which pages.** Judged from the address only, never the page. `http` and `https` addresses where the host starts with `billing.`, `pricing.` or `checkout.`, or where any path segment (or segment of the `#` route) equals `billing`, `pricing`, `price(s)`, `plan(s)`, `subscription(s)`, `subscribe`, `upgrade`, `checkout`, `invoice(s)`, `payment-method(s)` or `manage-subscription`, ignoring case. `/blog/our-plans-for-2026` does not match; `/en/pricing?ref=x` and `app.example.com/#/settings/plans` do.
- **Can be turned off.** The setting **Show Add to longbook on billing and price pages** (on by default) hides the button and the menu items everywhere when it is off.
- **Only on a Mac.** The button and the menu item are not offered on other systems, because longbook has no version for them (`navigator.userAgentData.platform`, falling back to `navigator.platform`).
- **Where.** A small **Add to longbook** button on that tab's row, between the title and the close button (accessible name "Add <Name> to longbook"), and an **Add to longbook** item in the tab's context menu.
- **The name.** The site's own name: `www.` removed, the registrable label taken (one label further left for `co.uk`-style endings), first letter capitalised. `github.com` gives `Github`; `billing.example.co.uk` gives `Example`. An IP address is used as it is.
- **The link.** `longbook://add?name=<name, percent-encoded>&from=bettertabs`, opened by clicking a temporary link in the panel so Chrome shows its usual "Open longbook?" prompt the first time. longbook is expected to open its Add Commitment screen with the name filled in and everything else empty. BetterTabs sends nothing else, and nothing leaves the computer.
- **If longbook is not installed.** Chrome does not say whether an app answered, so BetterTabs does not guess. A plain **Get longbook** link sits in the right-click menu of tabs that offer the button, and in the settings (see Settings). It opens `https://longbook.app/?utm_source=bettertabs&utm_medium=extension&utm_campaign=add-to-longbook` in a new tab.

### Settings

A **Settings** icon button sits fixed at the bottom right of the panel (`aria-label` "Settings"; the list has extra bottom padding so it never covers a row). It opens a popover above it, which closes on `Esc` or an outside click and puts focus on the first control when it opens. Changes apply and are saved at once. There is no save button.

Below those, behind a rule, is **Keep automatic backups of my open tabs** (`#setting-backup`), a checkbox that is off by default, with a hint saying that it keeps the tab titles and addresses on this computer, about every five minutes, for around half a day, and that turning it off deletes them, and a **Restore from a backup** button (`#open-backups`) that closes the settings and opens the Backups popover (see Backups).

Below that, behind another rule, is the **Export open tabs** button (`#export-tabs`). It builds a bookmarks file (Netscape bookmark HTML, which Chrome can import) from the tabs the panel lists and offers it as a download named `bettertabs-` plus the date, ending `.html`, using a Blob and a download link, so no permission is needed. Tabs are grouped by window, the current window first as "This window (N tabs)", the rest "Window 2" and so on; each link shows the tab's list label (the user's own name if set) and its address. Tabs with no address and new-tab pages are left out. The status line announces "Exported N tabs to a file". Nothing is stored; the file is the user's.

### Backups

While `settings.autoBackup` is true, the service worker (`background.js`) keeps copies of the open tabs in `chrome.storage.local` under `backups`: an array, newest first, of `{ at: epoch ms, windows: [[{ title, url, pinned? }]] }`. Titles are cut to 200 characters and addresses to 2,000; new-tab pages and tabs with no address are left out. It listens for tab created, removed, updated and attached events and for browser start-up, and acts at most once every 30 seconds. It takes a copy when the last one is at least five minutes old and the list of addresses (per window, in order) differs from it, and it takes the first copy at once when the setting is turned on. After each copy the list is thinned: all copies of the newest 12 are kept, then the newest copy of each hour, up to 12 hours. If storage refuses the write (quota), the oldest copies are dropped until it fits. Turning the setting off removes `backups`. No permission beyond `tabs` and `storage` is used, and nothing is written to `chrome.storage.sync`.

The Backups popover (`#backups`, headed **Backups**, focus on the heading when it opens) lists the copies newest first. Each shows when it was taken ("Today, 2:05 PM", "Yesterday, …", or the weekday and date), "N tabs in M windows", and two buttons:

- **Restore** opens each saved window as a new, unfocused window with `chrome.windows.create`. Only `http` and `https` addresses are opened, and addresses that are already open in any window are skipped. The first tab of each window loads; the others are discarded (suspended) right after, and tabs that were pinned are pinned again. The popover closes and the status line says "Restored N tabs", with ", skipping M already open or not a web page" when some were left out, or "Nothing to restore: every web page in this backup is already open".
- **Save as file** downloads the copy as a bookmarks file named `bettertabs-backup-` plus the date and time, ending `.html`, in the same format as the export (windows named "Window 1" and so on). The status line says "Saved N tabs from this backup to a file".

**Delete all backups** (shown only when there are copies) removes `backups` and says "Deleted all backups". With no copies the popover says "No copies yet. The first one is taken when you open, close or change a tab.", and with the setting off, "Backups are off. Turn them on in Settings."

- **Show Add to longbook on billing and price pages**: a checkbox, on by default. Beneath it, "Needs the longbook app on your Mac" and a **Get longbook** link to `https://longbook.app/?utm_source=bettertabs&utm_medium=extension&utm_campaign=add-to-longbook`, opened in a new tab.
- **Open the panel in**: a select with **The view I used last** (default), **Sites**, **Windows**, **Recent** and **Groups**. A fixed choice is applied each time the panel opens, instead of the remembered view.

### Show current tab

The icon button next to the search box finds the active tab of the panel's window and brings it into view:

- If a search hides it, the search is cleared.
- If its folder is collapsed, the folder is expanded (and remembered as expanded).
- The row is scrolled to the middle of the panel (smoothly, or instantly under `prefers-reduced-motion`), keyboard focus moves to it, and it pulses once with a focus-coloured halo for about a second. Under `prefers-reduced-motion` the pulse is skipped.
- It works in every view.

### Tooltips

Every control has a native tooltip (the `title` attribute) that says what it does and, where one exists, the key that does the same. The shortcuts for **Open BetterTabs** and **Search tabs** come from `chrome.commands.getAll()`, so they show whatever the user set at `chrome://extensions/shortcuts`; if the call fails the shortcut is left out. The toolbar icon's tooltip is set the same way by the service worker ("Open BetterTabs (Alt+Shift+B)"). Tooltips on:

- The search box (`/`, and the search shortcut), **Show current tab**, each view label, **Close N duplicates** and the settings button.
- Each folder's header (**Collapse** or **Expand** plus its name), **Group**, **Suspend** (what it unloads and what it leaves alone) and **Close all** (and the reopen key, `Cmd+Shift+T` on a Mac, `Ctrl+Shift+T` elsewhere).
- Each tab row (name, original name if renamed, address, "Click to switch to this tab. F2 renames it."), its close button ("Close tab (Delete key). It closes straight away."), and its **Add to longbook** button.
- Every item in the right-click menu (including `F2` on **Edit name**), every control in the settings and the Backups popover, and each favourite icon (see Favourites).

### Search

- Case-insensitive. The query is split on whitespace; a tab matches when every word appears in its custom name, its title or its URL.
- The summary reads `X of Y tabs match` while searching, otherwise `Y tabs in Z windows`.
- Folders collapsed by the user are shown expanded while a query is active.
- No matches: the list shows "No tabs match “query”." and a **Clear search** button.

### Collapsing

Clicking a folder header toggles it. The toggle button has `aria-expanded`. Collapsed folders are remembered per view and folder.

### Live updates

The list redraws (debounced by 60 ms) when tabs are created, removed, moved, attached, detached, replaced or activated, when a tab's `title`, `url`, `pinned`, `audible`, `groupId` or `status` or `discarded` changes, when tab groups change, and when window focus changes. While the panel is hidden, updates are deferred until it is shown again. Keyboard focus is kept on the same tab across redraws.

### Persistence

`chrome.storage.local` holds `{ view, collapsed: string[], settings: { showLongbook: boolean, startView: 'last' | 'site' | 'window' | 'recent' | 'group', autoBackup: boolean }, remembered: { names: { [pageHash]: string } }, favourites: { url: string, title: string }[], backups?: Backup[] }` (`backups` exists only while automatic backups are on; see Backups) where each collapsed id is `<view>:<folder key>`. `chrome.storage.session` holds `{ names: { [tabId]: string }, favourites: number[] }`, the custom tab names and the favourite tab ids for this run of Chrome, plus a short-lived `focusSearch` timestamp that the keyboard shortcut leaves for the panel. Nothing else is stored.

## Keyboard

| Key | Effect |
| --- | --- |
| `/` | Focus the search box |
| `Esc` (in search) | Clear the search |
| `↓` (in search) | Move to the first tab |
| `Enter` (in search) | Switch to the first match |
| `↓` / `↑` (on a tab) | Next / previous visible tab; `↑` from the first tab returns to search |
| `F2` (on a tab) | Rename the tab |
| `Delete` (on a tab) | Close the tab |

Two shortcuts are declared in the manifest as `commands` and handled by the service worker, which opens the panel with `chrome.sidePanel.open` before doing anything else, so the key press still counts as the user's action. `Alt+Shift+B` (`open-panel`) opens the panel. `Alt+Shift+F` (`search-tabs`) opens it and leaves a `focusSearch` note in session storage; the panel focuses and selects the search box when it reads a note under five seconds old, and removes the note. Users can change both at `chrome://extensions/shortcuts`.

## Visual design

- System font, 13 px at the default size, all sizes in `rem`.
- Light and dark themes via `prefers-color-scheme`.
- Folders look like file-folder tabs: a tinted tab sitting on a tinted underline.
- Interactive targets are at least 24 CSS px tall.
- Focus: 2 px outline with `:focus-visible`.
- The only motion is the folder chevron rotating; it is disabled under `prefers-reduced-motion`.

## Accessibility

- One `<h1>`, folder names are `<h2>`.
- Radio group for the view switch with a hidden `<legend>`.
- `aria-live` is not used on the count. A separate `role="status"` element announces the search result count and "Closed N tabs", so routine tab changes stay silent.
- Close buttons are labelled "Close <title>"; "Close all" is labelled with the count and folder name.
- Works with keyboard only; works in forced-colours mode.

## Privacy

No network requests and no analytics. The only links that leave the browser are ones you click: the longbook link, and Get longbook (in the right-click menu and the settings), which opens a web page in a new tab. Tab titles and URLs are read to display them and are never sent anywhere. They are stored only if the user turns on automatic backups, and then only on the computer, until the setting is turned off or the backups are deleted. Names the user types are saved on the computer under a hash of the page address, never the address. The pages the user favourites are saved on the computer with their title and address, until the user removes them. Nothing saved is ever sent anywhere.

## Out of scope

Reading page content to find prices, filling in more than the name, knowing whether longbook is installed, Windows or Linux support for the longbook button, syncing between devices, saving or restoring sessions, closing or suspending tabs automatically, undoing a close (Chrome's **Reopen closed tab**, `Ctrl/Cmd+Shift+T`, does that), and page content access.
