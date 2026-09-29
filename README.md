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
- `site/intro.js` — the particle portal intro (the old portal's strands, no p5). Once per session; `?intro` / `?nointro`.
- `site/viewer.js` + `site/rig.js` — the asset turntable. Previews live in `models/assets/` (copies from the game repos).
- `site/colin.js` — mini-Colin (`models/colin.glb`). Brain + voice are the `orb-brain` Worker, cast `colin`.
  Its `ALLOWED_ORIGIN` is `https://colinwillow.github.io`, so he only talks there until the Worker also allows colinwillow.com.
- `site/reader.js` + `site/speech.js` + `writing/` — essays with optional recorded readings (see `writing/README.md`).
- `404.html` — lets deep links like `/scripts/arp-to-mixamo` work on Pages.

Run locally: `python3 -m http.server` in this folder. (Deep links need Pages'
404 fallback; locally use `/?p=scripts/arp-to-mixamo`.)

**Before every push: `npm run bump`.** It stamps each script/stylesheet URL with a hash of its contents,
so a phone never runs a new page against an old cached module. The footer shows the build.
