# TheLinkPanda — Growth Stack Deployment

Copy the contents of this folder into your Cloudflare Pages project root (the same
folder that contains index.html) and deploy. Everything is additive.

## What's in here

| Path | What it does |
|---|---|
| `index.html` | Your site + today's upgrades (FAQ schema, RSS link, embed buttons, analytics hook) |
| `sitemap.xml` | 131 URLs: all pages, 55 evidence permalinks, 50 misconception permalinks, 17 org profiles |
| `feed.xml` | RSS feed of the 30 newest evidence entries |
| `functions/evidence/[id].js` | Crawler-visible per-entry titles/descriptions/OG images for /evidence/ev-NNN |
| `functions/misconceptions/[id].js` | Same for /misconceptions/mc-NNN |
| `functions/embed/[id].js` | Lightweight embeddable evidence cards at /embed/ev-NNN |
| `assets/og/*.png` | 55 branded 1200x630 share cards, one per evidence entry |

## After deploying — 15 minutes of activation

1. **Google Search Console** (search.google.com/search-console): add thelinkpanda.com,
   submit sitemap.xml. Same at Bing Webmaster Tools (free Yandex/DuckDuckGo coverage too).
2. **Cloudflare Web Analytics**: dash.cloudflare.com > Analytics > Web Analytics > add site.
   Copy your token, open index.html, search for YOUR_TOKEN_HERE, paste it, uncomment the script.
3. **Test the unfurls**: paste https://thelinkpanda.com/evidence/ev-055 into
   https://cards-dev.twitter.com/validator or a Discord message. You should see the
   ICMA title + branded gold card, not the generic banner.
4. **Test an embed**: https://thelinkpanda.com/embed/ev-055 should show a small card.
   Embed snippet (also copyable from the EMBED button on any evidence card):
   <iframe src="https://thelinkpanda.com/embed/ev-055" width="560" height="320" frameborder="0"></iframe>

## Maintenance when you add entries

- Regenerate feed.xml + sitemap.xml (or ask Claude — takes seconds)
- The functions' metadata and OG images are also generated from your data;
  re-ask Claude after adding entries to refresh them.
- Update the project knowledge copy of index.html!
