---
name: bettertabs
description: Use for any work in the BetterTabs repository (the side-panel extension, its preview page, the site, releases and the Web Store listing). Routes to the part of AGENTS.md or docs/ that each kind of work needs.
---

# Working on BetterTabs

Read `AGENTS.md` (its hard rules bind every change) and `MEMORY.md` first. Then read only what the
work needs:

| Work | Read |
|---|---|
| Changing the extension | `AGENTS.md`: Hard rules, Build and test, the `sidepanel.js` map |
| Rebuilding it as a variant | `docs/SPEC.md` |
| A release or Web Store submission | `docs/RELEASING.md`, `docs/store-listing.md`, `docs/store-seo.md` |
| The landing page | `docs/site.md` |
| Choosing what to build next | `docs/research/` |
| What each command does | `docs/scripts.md` |

## Done when

- `node scripts/check.mjs` prints ✓, the preview page shows the change in light and dark mode, the change
  has been tried in real Chrome when it touches Chrome APIs, the docs listed under "Docs go with the
  code" are updated in the same commit, and `MEMORY.md` is current.

## Go-ahead

- The maintainer, each time: pushing, tagging, publishing a release, uploading to the Web Store,
  deleting branches (AGENTS.md rule 10).
