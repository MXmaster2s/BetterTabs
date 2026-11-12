# Changelog

What changed in BetterTabs, newest first. The version being worked on is in `extension/manifest.json`.

## 1.7.1

- **Backups made simple.** Settings now has two buttons for backup: **Save backup to a file** (favourites, saved lists, tab names, settings and recent tabs in one file you keep) and **Restore from a file**, which merges it back without deleting anything you have, and also lists your recent tabs. The file survives removing or reinstalling the extension, which Chrome otherwise wipes.
- **Favourite a whole site.** Right-click a site's folder in the Sites view and choose **Add site to favourites**. The icon (with a stacked edge) stands for every page on the site, so it no longer goes dim when a page changes address; it fades only when no tab on the site is open, and then a click opens the site's home page.
- **Shortcuts written for your computer.** Settings shows the keys with Mac symbols on a Mac (⌥⇧B) and lists the keys inside the panel too. On a Mac the ⌫ key now closes the tab you are on in the list, and tooltips say ⌘-click.
- **Settings redone.** Settings is now a full-panel page with a back button and grouped rows: Panel (starting view, the Add to longbook switch), Your tabs (Saved lists), Backup (Save backup to a file, Restore from a file), Keyboard shortcuts (the keys, and a button to change them), and About (version, privacy policy, report a problem). Saved lists and Restore use the same page style.
- **Search finds pages you closed.** When you type in the search box, matching pages from your Chrome history appear under **From your history** below the open tabs (up to 30, not already open); a click opens one in a new tab. BetterTabs reads history only to answer the search and keeps none of it. This adds the `history` permission, so Chrome shows a new line in the install warning and asks existing users to approve it.
- **Restore has three ways in.** **Choose a backup file** now uses Chrome's file chooser, falls back to the plain file input, and you can also drop the backup file onto the Restore screen, in case a file dialog will not open from the side panel.
- **Recent tabs are automatic.** The copies of your open tabs that used to be "automatic backups" are no longer a setting you tick: BetterTabs keeps them on your computer for about half a day, shows them as **Recent tabs** inside Restore, and **Delete recent tabs** removes them. They are not a real backup, since Chrome deletes them with the extension, so the panel no longer calls them backups. **Export open tabs** is gone from Settings; a recent-tab copy can still be saved as a bookmarks file.
- **The list holds still.** Rows no longer move under your mouse when a tab closes or opens: folders and tabs keep their places (in Recent too, so clicking a tab does not make it jump). When the list is no longer in sorted order, **Tidy up** appears next to Select and sorts it again.

## 1.7.0

- **Clearer Store name and summary.** The extension is now named "BetterTabs: Side Panel Tab Manager", with a one-line summary that says what it does, so people searching the Chrome Web Store for a tab manager can find it. Nothing changes in how it works.
- **Saved lists.** With tabs ticked in Select mode, **Save list** names them and keeps each tab's title and address on your computer; tick **Close these tabs after saving** to clear them away. **Saved lists** in the settings shows every list: **Open** puts it in a new window (only the first tab loads), **Save as file** downloads it as bookmarks, and **Delete** removes it after a second click. Lists stay until you delete them.
- **Select several tabs.** **Select** (or Ctrl or Cmd-click a tab) puts a tick box on every row. Tick tabs one by one, Shift-click for a range, or **Select all** on a folder (after a search, that picks everything that matches), then **Close**, **Suspend** or **Group** them together from the bar at the bottom. **Done** or `Esc` leaves Select mode.
- **Group** on each site's folder (Sites view) puts that site's tabs into one Chrome tab group named after the site, one group per window. Pinned tabs are left out, and it hides once a window's tabs are already together.
- **Favourites stay when you close the tab.** The icon remains in the row above the search box, faded with a dashed edge, and a click opens the page again. Remove it from its right-click menu. A favourite now keeps the page's title and address on your computer until you remove it, so favourites you made in an earlier version are not carried over.
- Clicking a favourite also scrolls the list to its tab and pulses the row, as **Show current tab** does.
- Every button, tab and menu item has a hover tooltip that says what it does and which key does the same. The search box and the toolbar icon show the shortcuts you have set in Chrome.
- **Automatic backups**, a setting that is off until you turn it on. While it is on, BetterTabs keeps copies of the titles and addresses of your open tabs on your computer: a new copy about every five minutes while your tabs change, every copy of the last hour, then one an hour for about half a day more. Nothing is sent anywhere. Turning the setting off deletes the copies.
- **Restore from a backup** in the settings lists the copies, newest first. **Restore** opens each saved window as a new window, skips pages you already have open, and loads only the first tab of each window: the rest wait, suspended, until you click them. **Save as file** turns a copy into a bookmarks file, and **Delete all backups** removes them.

## 1.6.0

- Names you give tabs and your favourites now survive restarting Chrome. They come back when the same page is open again, and Chrome's **Reopen closed tab** brings a closed one back with its name. They are saved under a short hash of the page address; the address itself is never stored.
- **Suspend**: a button on each folder, and **Suspend tab** in the right-click menu, unload tabs you are not using from memory. They stay in the list, marked **Suspended**, and reload when you click them. The tab you are on, pinned tabs and tabs playing sound are left alone.
- **Export open tabs** in the settings saves a bookmarks file with the name and address of every open tab, grouped by window. Open it in any browser to see clickable links, or import it into Chrome's bookmarks. It is a file you keep; BetterTabs stores nothing and asks for no new permission.
- Two keyboard shortcuts: `Alt+Shift+B` opens the panel and `Alt+Shift+F` opens it with the search box focused. Change them at `chrome://extensions/shortcuts`.

## 1.5.0

- A **Settings** button at the bottom right of the panel. It can hide the **Add to longbook** button, and set which view the panel opens in. Settings are saved on your computer.
- The **Get longbook** link no longer sits beside the tab count. It stays in the right-click menu and in the settings.

## 1.4.0

- On a billing or price page (a Mac only), the tab's row shows an **Add to longbook** button, and the right-click menu has the same item. It opens longbook's Add Commitment screen with the site's name already filled in. A plain **Get longbook** link (summary row and the menu) opens longbook.app in a new tab. It needs a version of longbook that opens that screen from the link.

## 1.3.0

- Right-click a tab and choose **Add to favourites**. Its site icon appears in a row above the search box, and one click takes you to that tab. Right-click an icon and choose **Remove from favourites** to take it off. Closing the tab removes it from the favourites. Favourites last until Chrome closes, like tab names.

## 1.2.1

- Nothing changes in the extension itself. The repository is reorganised: the files Chrome loads now live in `extension/`, so **Load unpacked** takes that folder. Tools moved to `scripts/` and `preview/`.
- Added a `node scripts/package.mjs` command that builds the Web Store zip, release steps in `docs/RELEASING.md`, and contributor files and templates.
- The check now also fails when a document links to a file that does not exist.

## 1.2.0

- Rename a tab: right-click it and choose **Edit name**, or press `F2`. Renamed tabs show a **Renamed** badge, and **Reset name** puts the original back. Names last until Chrome closes.
- A **Show current tab** button next to the search box scrolls the list to the tab you're on, expanding its folder or clearing a search if needed.

## 1.1.0

- Renamed to BetterTabs.
- Folder names are headings, the current tab is marked with `aria-current`, and the toolbar is a proper landmark, so screen readers can navigate the list.
- Search results and closed tabs are announced politely; routine tab updates no longer are.
- All sizes use `rem`, so the panel follows Chrome's font-size setting. Interactive targets are at least 24 CSS px.
- High-contrast mode shows the current tab and selected view with outlines.
- The panel skips redraws while hidden and ignores tab updates that change nothing visible.
- `Delete` closes the focused tab; `Backspace` no longer does.
- Added the spec, agent instructions, store listing text, a preview page and checks.

## 1.0.0

- First version: tabs grouped by website, with Windows, Recent and Groups views, search, duplicate cleanup and live updates.
