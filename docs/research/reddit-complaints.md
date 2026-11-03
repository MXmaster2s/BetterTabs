# What people complain about on Reddit

Source: a Lighteningly sheet run on 2 November 2026 that asks an AI to find Reddit threads about tab managers and summarise what each poster dislikes and wishes for. 80 rows, 64 distinct threads, posted between February 2021 and October 2026, mostly in r/chrome_extensions (36 rows), r/chrome (27) and r/productivity (15). The cleaned rows are in [data/reddit-threads.csv](data/reddit-threads.csv).

## How far to trust it

The rows are an AI's summaries of search results. Titles, subreddits and dates read as real, but the threads were not opened. The thread links the AI returned could not be checked and several look invented, so the links were left out. This is good for themes and bad for quotes or counts of people. The theme counts below are keyword tallies, so treat them as rough.

## Themes

Threads out of 64, tagged by keyword over the two text columns (a thread can have several tags):

| Theme | Threads | What they say | Keywords |
| --- | --- | --- | --- |
| Lost tabs after a crash, restart or update | 22 | The biggest fear. Saved lists and Chrome's own session restore fail, and there is no backup | lost, crash, backup, wipe, restor, recover, disappear |
| Native vertical tabs | 21 | Complaints about Chrome's own sidebar: auto-hide, hover to expand, width. Not BetterTabs' to fix, but it shows people want a compact side list | vertical, sidebar, auto-hide, hover |
| Memory | 17 | Chrome using many gigabytes with a hundred tabs. People want suspending they can trust, and remember The Great Suspender being sold and abused | memory, RAM, suspend, sleep, unload, discard, CPU |
| Search across tabs and windows | 16 | Fast fuzzy search and jumping to a tab in another window | search, fuzzy, quick switch, jump to |
| Privacy | 16 | Local only, no cloud, no tracking. Workona and Toby are named for sending data to servers, and "local-first" is a selling point in many "I built" posts | privacy, local-first, local only, cloud, server, tracking, telemetry, permission |
| Automatic grouping | 12 | Grouping that does not need constant manual upkeep | auto group, grouping, group tabs |
| Workspaces | 7 | People who left Arc, wanting separate sets of tabs per project | workspace, per project |
| Tree view | 7 | Sidebery and tree-tab users | tree, nested, hierarchy |
| Duplicates | 7 | Close duplicates before they load, or warn when opening one | duplicate |
| Price | 7 | One poster complains Toby moved from free to a paid model ($40 a year) | price, paid, subscription, expensive, paywall |
| Sync across devices | 7 | Wanting tabs on every device | sync |
| Keyboard use | 5 | Doing it all without the mouse | keyboard, shortcut, hotkey |
| Notes or reminders on tabs | 3 | "Why did I open this?" | note, remind, annotate |

Other single complaints worth knowing: Workona unsuspends a tab as soon as you look at it, and a flat saved list (OneTab) hides what is active and lets hundreds of unread links pile up.

## Who gets named

Threads that name each product (a thread can name several):

| Product | Threads |
| --- | --- |
| OneTab | 15 |
| Chrome's native vertical tabs | 13 |
| Chrome's tab groups | 11 |
| Session Buddy | 11 |
| Workona | 8 |
| Toby | 7 |
| Sidebery, Arc | 3 each |
| Tab Manager Plus | 2 |
| Tabs Outliner, Tab Wrangler, VertiTab, SideTab Pro, Side Space, TabXpert, Tab Master | 1 each |

## What it means for BetterTabs

- **Losing tabs is the single most repeated pain.** Remembering names and favourites (1.6.0) helps a little. The real fix people ask for is a backup they can trust: exporting every open tab to a file is built (1.6.0), and automatic local backups are on the roadmap.
- Automatic backups store page titles and addresses on disk, which [AGENTS.md](../../AGENTS.md) rule 6 forbids today. That is a decision for the maintainer, not a coding detail, and the roadmap lists it as a setting you turn on. A manual export that writes a file the user keeps does not break the rule.
- **Memory and suspending came second.** BetterTabs' Suspend needs no host permissions, which is the trust signal people ask for.
- **"Local, no cloud, no account" is already what BetterTabs is.** It belongs in the first line of the store listing.
- **Search across windows** is already built.
- **Features people wish for that BetterTabs does not have yet** are on the website's roadmap: tab groups from a site, workspaces, a tree view, duplicate warnings, notes.
- A difference from an earlier tally in the research notes: with the keywords above, lost tabs come to 22 threads, where a looser keyword set gave about 30. The listed keywords are the reproducible ones.
