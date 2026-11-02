# Changelog

What changed in BetterTabs, newest first. The version being worked on is in `extension/manifest.json`.

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
