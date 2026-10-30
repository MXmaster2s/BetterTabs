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

1. **Service worker** (`background.js`): calls `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` so clicking the toolbar icon opens the panel.
2. **Side panel page** (`sidepanel.html`, `.css`, `.js`): everything the user sees.

## Layout of the panel

From top to bottom:

1. A visually hidden `<h1>` "Open tabs".
2. A search box (`type="search"`, label "Search tabs").
3. A four-way view switch (radio group): **Sites**, **Windows**, **Recent**, **Groups**.
4. A summary row: the tab count on the left; on the right, a "Close N duplicates" text button shown only when duplicates exist.
5. The list: a column of folders. Each folder has a header (`<h2>` wrapping a toggle button with the folder name and its tab count, plus a "Close all" button) and a `<ul>` of tab rows.
6. A visually hidden `role="status"` element for screen reader announcements.

The toolbar (items 2 to 4) stays pinned to the top while the list scrolls.

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
- Badges on the second line: **Duplicate**, **Pinned**, **Playing** (`tab.audible`).
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

### Search

- Case-insensitive. The query is split on whitespace; a tab matches when every word appears in its title or URL.
- The summary reads `X of Y tabs match` while searching, otherwise `Y tabs in Z windows`.
- Folders collapsed by the user are shown expanded while a query is active.
- No matches: the list shows "No tabs match “query”." and a **Clear search** button.

### Collapsing

Clicking a folder header toggles it. The toggle button has `aria-expanded`. Collapsed folders are remembered per view and folder.

### Live updates

The list redraws (debounced by 60 ms) when tabs are created, removed, moved, attached, detached, replaced or activated, when a tab's `title`, `url`, `pinned`, `audible`, `groupId` or `status` changes, when tab groups change, and when window focus changes. While the panel is hidden, updates are deferred until it is shown again. Keyboard focus is kept on the same tab across redraws.

### Persistence

`chrome.storage.local` holds `{ view, collapsed: string[] }` where each collapsed id is `<view>:<folder key>`. Nothing else is stored.

## Keyboard

| Key | Effect |
| --- | --- |
| `/` | Focus the search box |
| `Esc` (in search) | Clear the search |
| `↓` (in search) | Move to the first tab |
| `Enter` (in search) | Switch to the first match |
| `↓` / `↑` (on a tab) | Next / previous visible tab; `↑` from the first tab returns to search |
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

No network access. No analytics. Tab titles and URLs are read to display them and are never stored or sent anywhere.

## Out of scope

Syncing between devices, saving or restoring sessions, undoing a close (Chrome's **Reopen closed tab**, `Ctrl/Cmd+Shift+T`, does that), tab suspension, and page content access.
