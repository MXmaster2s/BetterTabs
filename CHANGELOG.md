# Changelog

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
