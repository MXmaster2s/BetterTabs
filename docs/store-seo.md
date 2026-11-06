# Being found on the Chrome Web Store

Written 3 Nov 2026. Google publishes no ranking formula for the Store, so most of this is what developers report and what the official listing guide asks for. It is marked where it is a guess.

## Why "better tabs" may not find BetterTabs

Likely causes, most important first (all unconfirmed, because the Store does not explain its results):

1. **The name is one word.** A search for "better tabs" has two words; the listing was called "BetterTabs". Developer reports say the name carries the most weight in Store search, and a one-word brand does not match a two-word query. The name is now "BetterTabs: Side Panel Tab Manager" and the description opens with "a better tab manager", so both spellings and the phrases people use are present.
2. **A new listing has no installs and no ratings.** Reports say install rate, retention and reviews feed the ranking. Nothing here can be fixed by wording; it needs real users.
3. **Generic words.** "Better tabs" is a phrase dozens of extensions use. People search by need, not brand: "tab manager", "tab suspender", "save tabs", "close duplicate tabs", "vertical tabs".
4. **Slow indexing.** A new or updated listing can take days to show up in Store search. Check the exact name and the direct link first to tell "not indexed" from "ranked low".

## What people search

From Google autocomplete on 2 Nov 2026 (see `docs/research/`) and the Reddit threads:

| Need | Phrases |
| --- | --- |
| Manage | tab manager, chrome tab manager extension, best tab manager chrome, tab manager reddit, tab group manager |
| Side panel | vertical tabs chrome, vertical tabs side panel, tabs in side panel |
| Memory | tab suspender chrome, too many tabs chrome, reduce chrome memory |
| Save | save tabs, save all open tabs, save session, restore tabs, tab backup |
| Clean up | close duplicate tabs, group tabs by website |
| Trust | local tab manager, no account, private |

BetterTabs covers every row. The name takes "tab manager" and "side panel"; the summary takes "group tabs", "search", "suspend", "save", "private"; the description uses the rest in plain sentences.

## What counts, in order

1. **Name** (from `manifest.json`): brand first, then what it is. Keep it under 75 characters and honest; stuffing keywords or repeating them can get a listing suspended.
2. **Summary** (from `manifest.json` `description`, 132 characters): says what it does in one line. No "best", "fastest" or rival names, which the official guide forbids.
3. **Description**: the first two sentences are the snippet in search results and in Google. Use the phrases naturally, once or twice, never as a list of keywords.
4. **Images**: the small promo tile (440x280) is what shows in search results and on category pages, so it decides whether someone clicks. Screenshots decide whether they install.
5. **Ratings and installs**: the only part that cannot be written. Ask for honest reviews; never pay for them or reward a good score (the Store forbids it).
6. **Category**: Productivity.

## Assets

| Asset | Size | Notes |
| --- | --- | --- |
| Store icon | 128x128 | `extension/icons/icon128.png` |
| Screenshots | 1280x800, 1 to 5 | Short caption on each; one message per image; first image is the one most seen |
| Small promo tile | 440x280 | Shows in search results. Big name, one short line, no detail; it is read at thumbnail size |
| Marquee | 1400x560 | Optional, only used if the Store features the item |
| Video | YouTube link | Under a minute, silent is fine, show the panel working on a lot of tabs |

The small tile and marquee cannot be localised.

### Screenshot plan

Each image answers a pain people raised most in the Reddit research (`docs/research/`), in the order they raised it. A person scrolling the listing sees their own problem first.

| # | Pain (threads out of 64) | Headline | Shows |
| --- | --- | --- | --- |
| 1 | Lost tabs after a crash or restart (about 30) | Never lose your tabs. | Saved lists and the backups popover |
| 2 | Memory, Chrome slowing down (about 17) | Too many tabs slowing Chrome? | Tabs marked Suspended, still in the list |
| 3 | Search across windows (about 14) | Find any tab in any window. | A search with its matches |
| 4 | Privacy, local only (about 16) | Nothing leaves your browser. | The five permissions and "no host permissions" |
| 5 | Hundreds of tabs, duplicates (about 7) | Hundreds of tabs, under control. | The Sites view with Close duplicates |

The images are made in a separate film project outside this repository (three small Playwright scripts), from the real panel on fake tabs.

### Promo tile and marquee text

- Small tile: `BetterTabs` large, below it `Side panel tab manager`.
- Marquee: `BetterTabs` and `Every open tab, from every window, grouped by site.`

## Outside the Store

- **Google Search**: Google sometimes shows Store listings, but Store pages cannot be submitted to Search Console, and developers report no way to force indexing. Own the website for the same phrases: `bettertabs.fyi`, with pages on "tab manager", "close duplicate tabs" and "save tabs". Link to the Store listing from every page.
- **First installs**: the launch posts (Show HN, r/chrome_extensions, Product Hunt) link to the Store page, which makes the first installs and the first reviews.
- **Measure**: the Store dashboard shows impressions, installs and uninstalls. Check the exact-name search and the "tab manager" search weekly, and write down where it ranks.

## Sources

- Official: [Creating a great listing page](https://developer.chrome.com/docs/webstore/best-listing), [Complete your listing information](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- Developer reports (anecdotal): [Chrome Web Store SEO: how I optimized 17 extensions](https://dev.to/ktg0215/chrome-web-store-seo-how-i-optimized-17-extensions-for-search-2maj), [what moved the needle after publishing 18 extensions](https://dev.to/ktg0215/cws-listing-seo-what-actually-moved-the-needle-after-publishing-18-extensions-37i1), [Why is Chrome Webstore search so bad?](https://groups.google.com/a/chromium.org/g/chromium-extensions/c/JMtfgiagcgY)
