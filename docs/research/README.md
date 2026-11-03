# Research

What was learned about other tab managers, where their traffic comes from, what people search for and what they complain about. It exists so that what BetterTabs builds next, and what its website says, rests on evidence instead of guesses.

Researched on 2 November 2026.

| Read | For |
| --- | --- |
| [competitors.md](competitors.md) | Who the competitors are, how big they are, where their website traffic comes from, what people type into Google, and BetterTabs set against them |
| [reddit-complaints.md](reddit-complaints.md) | What people on Reddit dislike about tab managers and wish for, with counts |
| [data/](data) | The cleaned data behind both: four CSV files |

## How far to trust it

Each figure says where it came from. In short:

- **Users, ratings and rating counts** were read from each extension's Chrome Web Store page. Those are the most reliable numbers here.
- **Website traffic** is Ahrefs' free traffic checker: an estimate of organic search visits over 30 days, not real analytics. It does not count visits from the Web Store, word of mouth or ads.
- **Search phrases** are Google autocomplete suggestions. They show what people type, not how often.
- **Reddit complaints** were collected by Lighteningly, which asks an AI to read Google search results for Reddit threads. The titles, dates and complaint text are the AI's summaries, not verified quotes. The thread links it returned could not be checked and several look invented, so **the links are left out of the data**. Use the themes, not individual rows.
- **Claims about rival features** come from comparison articles, two of them written by makers of competing extensions. Treat those as marketing.

## What is in the data folder

| File | One row per | Columns |
| --- | --- | --- |
| [competitors.csv](data/competitors.csv) | Competitor | Name, kind, users, rating, ratings count, what it does, website, where the figures came from, date checked |
| [website-traffic.csv](data/website-traffic.csv) | Competitor website | Monthly organic visits, top countries, top search phrases |
| [search-phrases.csv](data/search-phrases.csv) | Search seed | What Google autocomplete suggested |
| [reddit-threads.csv](data/reddit-threads.csv) | Extension named in a thread | Subreddit, posted date, thread title, products named, what they dislike or miss, the feature they wish for, themes |

`reddit-threads.csv` has 80 rows covering 64 distinct threads, because a thread that names several extensions has a row for each. The `products_named` and `themes` columns were added by keyword matching over the two text columns (the keywords are listed in [reddit-complaints.md](reddit-complaints.md)), so they are a rough tag, not a judgement.

## Refreshing it

The Reddit data came from a Lighteningly sheet: a copy of an existing Reddit-search sheet with its prompt rewritten for tab managers. To refresh it, run that sheet again, export the CSV, drop the empty columns and the link column, split the subreddit from the date, and re-tag. Store figures are a manual read of each Web Store page; traffic and phrases are free web tools. Put the date checked on every row you change.
