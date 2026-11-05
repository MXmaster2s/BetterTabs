# MEMORY.md

The project's technical state, for anyone working in this repository. One dated line each, newest
first. Changed in commits like any file. How to work here is in `AGENTS.md`.

## Now

- Version 1.7.1 in `extension/manifest.json`. The Chrome Web Store has 1.6.0; later versions wait for a
  new submission (see `docs/RELEASING.md`). Versions are bumped only for a Store submission.
- Nothing after 1.6.0 has been tried in real Chrome yet (AGENTS.md, Build and test, step 3).
- The site is live at https://bettertabs.fyi (GitHub Pages from `site/`).

## Decisions

- 2026-11-04 · The recent-tab copies are automatic, with no setting, and are shown as **Recent tabs**,
  never "backups"; Settings keeps only "Save backup to a file" and "Restore from a file".
- 2026-11-03 · Names and favourites survive restarts, stored by a SHA-256 hash of the page address;
  favourites and saved lists keep `{ url, title }` until the user removes them (AGENTS.md rule 6).
- 2026-11-02 · "Add to longbook" on billing pages opens `longbook://add`; the longbook app does not
  handle that link yet.

## Half done

- Roadmap left: drag and drop, close idle tabs automatically, an Edge listing.
