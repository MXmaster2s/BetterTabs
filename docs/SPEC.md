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
- Hovering a row shows the full URL in a tooltip.

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
- Names are kept in `chrome.storage.session`, keyed by tab id: in memory only, they survive closing the panel and navigating inside the tab, and are dropped when the tab closes or Chrome quits.
- While a name is being edited, the browser's own context menu (copy, paste) is left alone.

### Favourites

- **Add to favourites** in a tab row's context menu adds that tab; the same item reads **Remove from favourites** for a tab that is already a favourite. Added tabs are shown in the order they were added.
- Each favourite is a square icon button (the site's favicon, or the letter tile) in a row above the search box. The row wraps and is hidden when empty. The button's accessible name and tooltip are the tab's name (custom name if it has one), and the tooltip also shows the URL.
- Clicking an icon switches to that tab, as clicking its row does, including focusing its window. The icon of the tab you are looking at has `aria-current="true"` and the highlighter background (an outline in forced-colours mode).
- Right-clicking an icon (or pressing the context-menu key on it) opens a menu with only **Remove from favourites**. After removing from the row, keyboard focus moves to that tab's row in the list.
- A tab that is a favourite shows a **Favourite** badge in the list.
- When a favourite tab closes, it is removed from the favourites. Navigating inside the tab keeps it, and its icon follows the page.
- Added and removed are announced ("Added to favourites", "Removed from favourites").
- Favourites are tab ids in `chrome.storage.session`: in memory only, gone when Chrome quits.

### Show current tab

The icon button next to the search box finds the active tab of the panel's window and brings it into view:

- If a search hides it, the search is cleared.
- If its folder is collapsed, the folder is expanded (and remembered as expanded).
- The row is scrolled to the middle of the panel (smoothly, or instantly under `prefers-reduced-motion`), keyboard focus moves to it, and it pulses once with a focus-coloured halo for about a second. Under `prefers-reduced-motion` the pulse is skipped.
- It works in every view.

### Search

- Case-insensitive. The query is split on whitespace; a tab matches when every word appears in its custom name, its title or its URL.
- The summary reads `X of Y tabs match` while searching, otherwise `Y tabs in Z windows`.
- Folders collapsed by the user are shown expanded while a query is active.
- No matches: the list shows "No tabs match “query”." and a **Clear search** button.

### Collapsing

Clicking a folder header toggles it. The toggle button has `aria-expanded`. Collapsed folders are remembered per view and folder.

### Live updates

The list redraws (debounced by 60 ms) when tabs are created, removed, moved, attached, detached, replaced or activated, when a tab's `title`, `url`, `pinned`, `audible`, `groupId` or `status` changes, when tab groups change, and when window focus changes. While the panel is hidden, updates are deferred until it is shown again. Keyboard focus is kept on the same tab across redraws.

### Persistence

`chrome.storage.local` holds `{ view, collapsed: string[] }` where each collapsed id is `<view>:<folder key>`. `chrome.storage.session` holds `{ names: { [tabId]: string }, favourites: number[] }`, the custom tab names and the favourite tab ids. Nothing else is stored.

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

No network access. No analytics. Tab titles and URLs are read to display them and are never stored or sent anywhere. Names the user types and the tabs they favourite are held in memory for the browser session and never written to disk or sent anywhere.

## Out of scope

Syncing between devices, names that survive restarting Chrome, saving or restoring sessions, undoing a close (Chrome's **Reopen closed tab**, `Ctrl/Cmd+Shift+T`, does that), tab suspension, and page content access.
