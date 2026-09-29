# portfolio

Colin Willow's portfolio. No build step: `index.html` + native ES modules in
`site/`, three.js vendored in `vendor/`. Served by GitHub Pages from `main`.

- `index.html` — the new site. **`classic.html` is the previous portfolio**,
  kept exactly as it was (it loads its media from this repo's `main`).
- `site/content.js` — every word, link and item on the site. Edit this, not
  the page code. Slugs are URLs; don't rename one after linking to it.
- `site/globe.js` — the three.js stage (globe, ribbons, section labels).
- `site/palette.js` — the procedural accent. `?accent=teal`, `?hue=200`, or the
  dot top-right (tap cycles presets, hold = random).
- `404.html` — lets deep links like `/scripts/arp-to-mixamo` work on Pages.

Run locally: `python3 -m http.server` in this folder. (Deep links need Pages'
404 fallback; locally use `/?p=scripts/arp-to-mixamo`.)
