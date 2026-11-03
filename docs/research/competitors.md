# Competitors

Researched 2 November 2026. How reliable each part is: [README.md](README.md). The numbers are in [data/competitors.csv](data/competitors.csv), [data/website-traffic.csv](data/website-traffic.csv) and [data/search-phrases.csv](data/search-phrases.csv).

## Who they are

| Extension | Users | Rating (ratings) | What it is |
| --- | --- | --- | --- |
| OneTab | 2,000,000 | 3.8 (14.6K) | Collapses all tabs into one saved list |
| Session Buddy | 1,000,000 | 3.3 (25.1K) | Saved and crash-recovered sessions |
| Toby | 300,000 | 3.6 (3.3K) | Drag tabs into visual collections |
| Workona | 200,000 | 4.2 (3.8K) | Project workspaces, team sharing |
| Tabs Outliner | 100,000 | 3.2 (3.3K) | Tree view with notes |
| Tab Wrangler | 50,000 | 4.2 (947) | Closes idle tabs automatically |
| Tab Manager Plus | 200,000+ (article, not checked) | 4.7 (article) | Fast search, duplicates, open source, last updated Oct 2024 |
| Vertical Tabs in Side Panel | 100,000+ (article, not checked) | 4.4 (article) | Plain vertical list in the side panel |
| VertiTab | 20,000+ (article) | 4.7 (article) | Vertical, tree, AI grouping, snapshots, sync |
| SuperchargeNavigation | no figures found | no figures found | Workspaces, 50 automatic snapshots, keyboard search |

Also relevant: **Chrome's own vertical tabs**, rolled out from April 2026 (sources say Chrome 146 or 147; no official Google post found). Per a vendor article, they lack workspaces, saved sessions, keyboard search and duplicate cleanup.

One article, from VertiTab's maker, listed OneTab 4.5, Session Buddy 4.7, Workona 4.6, Toby 4.2 and Tabs Outliner 4.4. The live store pages show 3.8, 3.3, 4.2, 3.6 and 3.2. Do not quote that article's ratings.

**The big tools are rated mediocre.** Session Buddy has 25K ratings and sits at 3.3. People install them because nothing better is easy to find, which leaves room for a tidy, trusted one.

## Where their traffic comes from

Ahrefs free traffic checker, organic search, last 30 days:

| Site | Organic visits a month | Top countries | Top search phrases (position, monthly volume) |
| --- | --- | --- | --- |
| one-tab.com | 3.3K | US 38%, Japan 27%, Australia 6%, UK 4% | "one tab" (2nd, 5.9K), "onetab" (2nd, 2.5K) |
| workona.com | 4.6K | US 57%, Brazil 6%, India 5%, UK 4% | "workona" (1st, 1.5K); "google doc templates" (1st, 5.4K, unrelated); "how to switch tabs with keyboard" (6th, 3.2K) |
| gettoby.com | 1.5K, down from about 2.6K in July | US 38%, Canada 8%, Sweden 6%, France 5% | "toby" (1st, 11K) |
| sessionbuddy.com | 295 | US 61%, Japan 11%, UK 3% | "session buddy" (2nd, 1K) |
| tabsoutliner.com | 2 | Japan 100% | "tabs outliner" (3rd, 30) |

What this says:

- Almost every visit is someone typing the product's own name. Brand searches, not generic ones, are the website traffic.
- OneTab has 2 million installs and about 3,300 search visits a month. A website is not where installs come from. Installs come from the Chrome Web Store (its own search and "alternatives" lists), word of mouth and articles. The Store does not publish install trends, so this could not be measured.
- The one rival with content marketing is Workona, whose traffic comes from unrelated pages (templates, keyboard shortcuts).
- Not measured: Similarweb or any other visit source, daily installs, paid ads. Ahrefs' full Site Explorer refuses domains the account has not verified.

## What people type when they look for this

Google autocomplete, 2 November 2026. Full list: [data/search-phrases.csv](data/search-phrases.csv).

- People add "reddit", "best" and "extension", so Reddit threads and "best of" lists matter.
- "Save", "session" and "restore" are a separate need from "manage".
- "Vertical tabs not working" and "not showing" are a live pain since Chrome's native rollout.
- "Group tabs by website" offers no extension phrase, which may be a gap, but there is no volume figure.
- Ahrefs' free keyword tool only gives buckets ("tab manager" and "chrome tab manager" are above 100 a month in the US), so there are no real volumes for generic phrases.

## BetterTabs against the field

**Ahead:** groups by site (not a headline feature in any article), duplicate cleanup that keeps the tab you are on, nothing leaves your browser, stays open as a side panel, small and open source, rename and favourites, suspend without reading pages, names and favourites that survive a restart, export of every open tab, opt-in automatic backups with restore, keyboard shortcuts.

**Behind:** not on the Web Store yet, Chrome only, no saved lists, no workspaces, no sync, no automatic closing of idle tabs, no select-several or drag and drop.

## Roadmap, easiest first

Effort is a guess for the current code, which has no build step, no network and few permissions. "No new permission" matters because every new permission makes the store review and the privacy page heavier.

| # | Feature | Borrowed from | Effort | Status |
| --- | --- | --- | --- | --- |
| 1 | Keep names and favourites across restarts | Session Buddy, Workona | Small | Built in 1.6.0 |
| 2 | Keyboard shortcuts to open the panel and search | Tab Manager Plus, SuperchargeNavigation | Small | Built in 1.6.0 |
| 3 | Suspend tabs in a folder or from the menu | Tab Wrangler, tab suspenders | Small | Built in 1.6.0 |
| 4 | Close old tabs from the Recent view | Tab Wrangler (manual) | Small | Already there: Close all on the Older folder |
| 5 | Export every open tab to a file | OneTab, Session Buddy | Small | Built in 1.6.0 |
| 6 | Group this site into a Chrome tab group | VertiTab AI grouping | Small to medium | Next |
| 7 | Saved lists, restored later | OneTab, Session Buddy, Toby | Medium | Next, kept on the computer only |
| 8 | Select several tabs, then close, suspend or move | Tab Manager Plus | Medium | Next |
| 9 | Drag to reorder and move between windows | Tab Manager Plus, Toby | Medium | Next |
| 10 | Close idle tabs automatically | Tab Wrangler | Medium | Next |
| 11 | Edge Add-ons listing, Brave note | VertiTab (cross-browser) | Small, plus store admin | Next, with the Web Store |
| 12 | Rolling snapshots for crash recovery | Session Buddy, SuperchargeNavigation | Medium to large | Built in 1.7.0, as an opt-in setting because it stores addresses |
| 13 | Workspaces | Workona, SuperchargeNavigation | Large | Later |
| 14 | Notes on tabs; warn on duplicate; tree view | Reddit threads, Tabs Outliner | Medium | Later |
| 15 | Cloud sync | Workona, Toby, VertiTab | Large | Not planned: breaks "nothing leaves your browser" |

The biggest lever is not a feature. It is getting onto the Chrome Web Store, because every rival's installs come from Store search, "alternatives" lists and Reddit, none of which a website alone reaches.

## Sources

- 10 Best Tab Manager Chrome Extensions in 2026 (RabbitPair, written by VertiTab's maker): https://www.rabbitpair.com/en/blog/10-best-tab-manager-chrome-extensions-2025
- Chrome 147 Vertical Tabs vs Extensions (SuperchargeBrowser, written by SuperchargeNavigation's maker): https://www.superchargebrowser.com/library/chrome-146-vertical-tabs-vs-extensions/
- Chrome native vertical tabs coverage: https://www.hongkiat.com/blog/chrome-vertical-tabs-reading-mode/
- Chrome Web Store listings for OneTab, Session Buddy, Workona, Toby, Tabs Outliner and Tab Wrangler, read 2 November 2026
- Ahrefs free traffic checker and keyword generator, 2 November 2026
- Google autocomplete, 2 November 2026
