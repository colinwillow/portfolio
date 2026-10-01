import { SITE, SECTIONS, PLAY, ASSETS, SCRIPTS, TUTORIALS, SUPPORT, SOCIALS, WEB, STUDIOS, MOTION, WORKBENCH, WRITING, GUMROAD, SONGS, SFX, ABOUT } from './content.js?v=ca05af42';
import { onAccent, nextPreset, randomAccent, initTheme, setTheme, sectionColours } from './palette.js?v=8afb0eea';

const BASE = window.BASE || '/';
// Which build this is (the content hash npm run bump stamped on app.js) -- in the footer, so a phone can say.
// the build badge: the script's hash AND the stylesheet's, so a change to either shows as a new number
const BUILD = (() => { const js = new URL(import.meta.url).searchParams.get('v') || 'dev';
  const css = new URL(document.querySelector('link[href*="style.css"]')?.href || location.href).searchParams.get('v') || '';
  return css ? js.slice(0, 4) + css.slice(0, 4) : js; })();
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = $('#view');
{ const t = $('#tagline'); if (t) t.textContent = SITE.tagline; }
$('#hero').innerHTML = `<p class="role">${esc(SITE.role)}</p>`;

// ---- routing ------------------------------------------------------------
// Every section and item has a real URL, so a tutorial can link straight to
// a script and a shared link lands where it was shared from.
const route = () => location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

/* Moving between pages is PHYSICAL, one motion, no fades between phases. The
   sections are laid out in a row (their order on the deck), so going to one
   further along pans the camera that way, and Colin on the bar walks with it --
   the world slides under his feet, which is what reads as the camera following
   him. Going INTO an item is a push forward in depth, coming back out is a
   pull back. The bar, the header and Colin are not part of the move: they are
   the cockpit the world moves past. Uses the View Transitions API where there
   is one (iOS 18+, Chrome); elsewhere the page simply rises in as before. */
const placeOf = r => [r[0] ? SECTIONS.findIndex(s => s.key === r[0]) : -1, r.length > 1 ? 1 : 0];
const calm = matchMedia('(prefers-reduced-motion: reduce)');
function travel(update) {
  const a = placeOf(route());
  const swap = () => { update(); };
  if (!document.startViewTransition || calm.matches) return swap();
  // measure where we are going only after the URL has changed
  let dir = 'right';
  const vt = document.startViewTransition(() => {
    swap();
    const b = placeOf(route());
    dir = a[0] === b[0] ? (b[1] > a[1] ? 'in' : 'out') : (b[0] > a[0] ? 'right' : 'left');
    document.documentElement.dataset.vt = dir;          // before the pseudo-elements are built
    if (dir === 'left' || dir === 'right') colin?.stroll?.(dir === 'right' ? 1 : -1, 700);
  });
  vt.finished.finally(() => { delete document.documentElement.dataset.vt; });
}
function go(path, push = true) {
  travel(() => {
    if (push) history.pushState(null, '', BASE + path);
    render();
    if (!route().length) scrollTo(0, 0);
  });
}
document.addEventListener('click', e => {
  const song = e.target.closest('[data-song]');
  if (song) { music.play(+song.dataset.song); return; }
  if (e.defaultPrevented) return;                     // something on the page handled it in place (a picked character)
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  const u = new URL(a.href);
  if (u.origin !== location.origin) return;
  e.preventDefault();
  go(u.pathname.slice(BASE.length).replace(/^\/+/, ''));
});
addEventListener('popstate', () => travel(render));

// ---- pieces ---------------------------------------------------------------
const link = (href, inner, cls = '') => `<a href="${esc(href)}" data-link class="${cls}">${inner}</a>`;
const ext = (href, inner, cls = '') => `<a href="${esc(href)}" target="_blank" rel="noopener" class="${cls}">${inner}</a>`;
const thumb = it => it.thumb
  ? `<img class="thumb" src="site/thumbs/${esc(it.thumb)}.png" alt="" loading="lazy" width="64" height="64">`
  : `<div class="mono" aria-hidden="true">${esc(it.title[0])}</div>`;
// Covers are 16:10 WebP in site/shots/. A logo-only entry shows its logo on a
// quiet panel; an entry with neither falls back to its initial.
const cover = it => it.shot
  ? `<img class="cover" src="site/shots/${esc(it.shot)}.webp" alt="" loading="lazy" width="1200" height="750">`
  : it.logo ? `<div class="cover logo"><img src="${esc(it.logo)}" alt="" loading="lazy"></div>`
  : `<div class="cover blank" aria-hidden="true">${esc(it.title[0])}</div>`;
/* A game's face is its APP ICON: they are phone games, and a wide screenshot
   of a vertical game shows mostly nothing. Rounded like it would be on a home
   screen. No icon yet: the screenshot, cropped square to match. */
const appIcon = it => it.icon
  ? `<img class="cover app" src="site/icons/${esc(it.icon)}.webp" alt="" loading="lazy" width="512" height="512">`
  : it.shot ? `<img class="cover app crop" src="site/shots/${esc(it.shot)}.webp" alt="" loading="lazy" width="512" height="512">`
  : `<div class="cover app blank" aria-hidden="true">${esc(it.title[0])}</div>`;
const STATUS = { live: 'Live', dev: 'In development', soon: 'Coming soon' };
const sectionOf = k => SECTIONS.find(s => s.key === k);
const crumbs = (...parts) => `<nav class="crumbs">${[link('./', 'Home'), ...parts].join(' / ')}</nav>`;
const head = (s, extra = '') => `${crumbs(esc(s.label))}<h2 class="title">${esc(s.label)}</h2><p class="lede">${esc(s.blurb)}${extra}</p>`;
// The support card: on every page, quiet, and honest when the link is not set yet.
const support = (big = false) => {
  const free = SOCIALS.filter(x => x.url).map(x => ext(x.url, esc(big ? x.label : x.short), 'btn ghost sm'));
  const coffee = SUPPORT.url ? ext(SUPPORT.url, '☕ ' + esc(SUPPORT.label), 'btn accent') : '';
  return `<aside class="support${big ? ' big' : ''}"><div><b>Found this useful?</b><p>${esc(SUPPORT.note)}</p></div>
  <div class="ways"><span class="lbl">Free</span>${free.join('')}<button class="btn ghost sm share" type="button">Share it</button></div>
  ${coffee ? `<div class="ways"><span class="lbl">Tip</span>${coffee}</div>` : ''}</aside>`;
};
// "Share it": the phone's own share sheet, or the link copied where there is none
document.addEventListener('click', async e => {
  const b = e.target.closest('.support .share'); if (!b) return;
  const data = { title: document.title, url: location.href };
  try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(location.href); b.textContent = 'Link copied'; setTimeout(() => (b.textContent = 'Share it'), 1600); } } catch {}
});
const foot = (sup = true) => `${sup ? support() : ''}<footer class="foot"><span>© ${new Date().getFullYear()} ${esc(SITE.name)}</span>
  <span>${ext(SITE.github, 'GitHub')} · <a href="classic.html">Previous portfolio</a> · build ${esc(BUILD)}</span></footer>`;

// ---- coming into view -----------------------------------------------------------
// Everything on a page arrives as it scrolls into view: a short rise and fade, staggered
// along each row, so a shelf of cards deals itself out rather than being there already.
// Sideways rails reveal as they are swiped. The classes come off once it has landed, so a
// card's own hover and picked states are never fighting the reveal for its transform.
const REVEAL = '.shelf-head, .rail > *, .grid > *, .gallery > *, .wall > *, .char-game, .wrap > h2, .wrap > .lede, .wrap > .row, .wrap > h3, .viewer, .support, .essay, .crumbs';
const revealIO = 'IntersectionObserver' in window && new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target; revealIO.unobserve(el); el.classList.add('in');
  const done = () => { el.classList.remove('rv', 'in'); el.removeEventListener('transitionend', end); };
  const end = ev => { if (ev.target === el && ev.propertyName === 'transform') done(); };
  el.addEventListener('transitionend', end); setTimeout(done, 1800);
}), { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
function reveal(root) {
  if (!revealIO || calm.matches) return;
  const seen = new Map();
  root.querySelectorAll(REVEAL).forEach(el => {
    if (el.closest('#about-hero')) return;
    const k = seen.get(el.parentElement) || 0; seen.set(el.parentElement, k + 1);
    el.style.setProperty('--rv', Math.min(k, 6) * 70 + 'ms');
    el.classList.add('rv'); revealIO.observe(el);
  });
}

// ---- picking a character -------------------------------------------------------
// ONE picker, wherever the faces are (the home shelf or the Characters page): tap a
// face, or someone in the line-up, and the line slides to them and their 3D viewer and
// details open right there under the faces. Nothing navigates; it is all one page.
const specs = it => `<dl class="specs">
  <dt>Tris</dt><dd>${it.tris.toLocaleString()}</dd>
  <dt>Joints</dt><dd>${esc(it.joints)}</dd><dt>Clips</dt><dd>${esc(it.clips)}</dd>
  <dt>File</dt><dd>${it.mb} MB</dd></dl>`;
const buy = it => it.gumroad
  ? ext(it.gumroad, (it.price ? esc(it.price) + ' · ' : '') + 'Get it on Gumroad ↗', 'btn accent')
  : `<span class="btn accent" aria-disabled="true">Coming to Gumroad</span>`;
const charDetail = it => it ? `<div id="char-viewer" class="viewer"></div>
    <div><h3>${esc(it.title)}</h3><p class="from">From ${esc(it.from)}</p>${specs(it)}
    <p class="notes">${it.notes.map(esc).join(' · ')}</p>
    <div class="row">${buy(it)}</div></div>`
  : `<p class="soon">Pick someone: tap them in the line-up, or a face above.</p>`;
function charPicker(root, { home = false } = {}) {
  const panel = root.querySelector('.char-detail'), faces = root.querySelectorAll('[data-char]');
  let viewer = null;
  const show = slug => {
    const it = ASSETS.find(x => x.slug === slug);
    CHARPICK.want = it ? slug : null;
    if (it) castFor(slug);
    const grp = [...faces].find(b => b.dataset.char === slug)?.closest('.char-group');
    if (grp && panel.previousElementSibling !== grp) grp.after(panel);   // their details open right under their game's row
    viewer?.destroy(); viewer = null;
    panel.innerHTML = it || !home ? charDetail(it) : ''; panel.classList.toggle('on', !!it);
    if (it) import('./viewer.js?v=97d84ef4').then(m => { if (CHARPICK.show === show && panel.querySelector('#char-viewer'))
      viewer = m.mountViewer(panel.querySelector('#char-viewer'), { url: it.glb, prefer: it.prefer, anim: it.anim }); });
    faces.forEach(b => b.classList.toggle('on', b.dataset.char === slug));
  };
  CHARPICK.show = show;
  if (!home && CHARPICK.want) { const w = CHARPICK.want; setTimeout(() => { LINEUP?.focus(w); show(w); }, 50); }   // arriving from a game page with someone picked
  faces.forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const slug = b.dataset.char;
    castFor(slug);                                       // their game's cast, before the line-up is asked for
    if (home) { latch('characters', false, true); toShelf(root.querySelector('#shelf-characters')); }   // the line-up in, and in view above the faces
    LINEUP?.focus(slug); show(slug);
  }));
  return { destroy() { viewer?.destroy(); CHARPICK.show = null; CHARPICK.want = null; LINEUP?.focus(null); } };
}

// one face: the same on the home shelf and the Characters page
const charFace = it => link('characters', `<img src="site/shots/char-${esc(it.slug)}.webp" alt="${esc(it.title)}" loading="lazy">
  <div class="tile-meta"><b>${esc(it.title)}</b><span>${it.clips} clips · ${(it.tris / 1000).toFixed(1)}k tris</span></div>`, 'figure').replace('<a ', `<a data-char="${esc(it.slug)}" `);
// the faces, a row per game
const charGroups = face => [...new Set(ASSETS.map(a => a.from))].map(g =>
  `<div class="char-group"><h4 class="char-game">${esc(g)}</h4><div class="rail figures">${ASSETS.filter(a => a.from === g).map(face).join('')}</div></div>`).join('');

// ---- pages ----------------------------------------------------------------
const PAGES = {
  // THE AISLE. Nothing on the home page is hidden behind a click: every section
  // is a shelf, laid out so you can walk past it and see what's on it. The
  // section pages still exist (deep links, "see all") but you never NEED them.
  home() {
    after = () => { mounted = charPicker(view, { home: true }); };
    const shelf = (key, body, { more = '', cls = '' } = {}) => {
      const s = sectionOf(key), n = String(SECTIONS.indexOf(s) + 1).padStart(2, '0');
      return `<section class="shelf ${cls}" id="shelf-${key}">
        <header class="shelf-head">${link(key, `<i>${n}</i><h3>${esc(s.label)}</h3>`)}<p>${esc(s.blurb)}</p>
          ${link(key, (more || 'See all') + ' →', 'shelf-more')}</header>${body}</section>`;
    };
    const rail = inner => `<div class="rail" tabindex="0">${inner}</div>`;
    const games = PLAY.map(it => link('play/' + it.slug, `${appIcon(it)}
      <div class="tile-meta"><b>${esc(it.title)}</b><span>${esc(it.kind)} · ${STATUS[it.status]}</span></div>`, 'tile game'));
    const clips = MOTION.slice(0, 9).map(m => `<figure><video data-src="${esc(m.src)}" poster="${esc(m.poster)}" muted loop playsinline preload="none"></video><figcaption>${esc(m.title)}</figcaption></figure>`);
    const essays = WRITING.map(w => link('writing/' + w.slug, `<span class="kicker">${w.reading ? '▶ ' + esc(w.voice || 'Listen') : 'Read'}</span>
      <b>${esc(w.title)}</b><q>${esc(w.excerpt || '')}</q>`, 'essay-card'));
    const sites = [...WEB, ...STUDIOS.filter(s => s.slug !== 'unknown')];
    return `<div class="aisle" id="index">
      ${shelf('play', rail(games.join('')), { more: 'All games' })}
      ${shelf('characters', `${charGroups(charFace)}<div class="char-detail"></div>`, { more: 'All characters', cls: 'shelf-figures' })}
      ${shelf('motion', `<div class="wall">${clips.join('')}</div>`, { more: `All ${MOTION.length} clips` })}
      ${shelf('writing', `<div class="rail">${essays.join('')}</div>`)}
      ${shelf('web', rail(sites.map(it => (it.url ? ext : (h, i, c) => `<div class="${c}">${i}</div>`)(it.url, `${cover(it)}
        <div class="tile-meta"><b>${esc(it.title)}</b><span>${esc(it.role || it.blurb)}</span></div>`, 'tile')).join('')), { more: 'Sites and studios' })}
      ${shelf('audio', rail(SONGS.slice(0, 8).map((t, i) => `<button class="tile song" data-song="${i}"><div class="song-art"><span>▶</span></div>
        <div class="tile-meta"><b>${esc(t.title)}</b><span>${esc(t.from)}</span></div></button>`).join('')), { more: 'Songs and free SFX' })}
      ${shelf('scripts', rail(SCRIPTS.map(it => link('scripts/' + it.slug, `<div class="glyph">&lt;/&gt;</div>
        <div class="tile-meta"><b>${esc(it.title)}</b><span>${esc(it.app)} · ${STATUS[it.status]}</span></div>`, 'tile script')).join('')))}
      ${shelf('workbench', `<div class="rail strip">${WORKBENCH.illustration.map(m => `<img src="${esc(m.src)}" alt="${esc(m.title)}" loading="lazy">`).join('')}</div>
        <div class="marquee" aria-hidden="true"><div>${[...WORKBENCH.logos, ...WORKBENCH.logos].map(m => `<img src="${esc(m.src)}" alt="" loading="lazy">`).join('')}</div></div>`)}
      <section class="shelf about-shelf">${link('about', '<h3>Who made this</h3>')}
        <p>I make games, rigged characters, tools, motion and brands — most of it running in a browser on a phone. Tap the little me in the corner and ask.</p></section>
      <div class="wrap">${foot()}</div></div>`;
  },

  play(slug) {
    const s = sectionOf('play');
    if (slug) {
      const it = PLAY.find(x => x.slug === slug || x.aliases?.includes(slug));
      if (!it) return missing();
      // its icon beside its name; its wide art is not on the page any more -- it is the header behind
      // Colin (gameArt / backdrop), standing in for gameplay footage until there is some
      const wide = gameArt(it);
      return `<div class="wrap">${crumbs(link('play', 'Games'), esc(it.title))}
        <div class="game-head">${it.icon ? `<img class="app" src="site/icons/${esc(it.icon)}.webp" alt="${esc(it.title)} icon">` : ''}
          <div><h2 class="title">${esc(it.title)}</h2><p class="lede">${esc(it.blurb)}</p></div></div>
        <div class="row">${ext(it.url, 'Open ' + esc(it.title) + ' ↗', 'btn accent')}
          <span class="pill ${it.status === 'live' ? 'hot' : ''}">${STATUS[it.status]}</span>
          ${it.tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        ${(() => {   // its app icon first, then whatever current art it has (never the throwaways)
          const pics = (it.gallery || (it.shot ? [it.shot] : [])).filter(g => g !== wide).map(g => `<img src="site/shots/${esc(g)}.webp" alt="${esc(it.title)}" loading="lazy">`);
          return pics.length ? `<div class="gallery">${pics.join('')}</div>` : ''; })()}
        ${(() => {   // the game's own cast, the same faces as everywhere else -- tap one to meet them on the Characters stage
          const cast = ASSETS.filter(a => a.from === it.title || a.also?.includes(it.title));
          return cast.length ? `<h3 class="sub">Characters</h3><div class="shelf-figures char-page game-cast"><div class="rail figures">${cast.map(charFace).join('')}</div></div>` : ''; })()}
        <p class="soon">App Store and Google Play badges go here when it ships.</p>${foot()}</div>`;
    }
    const card = it => link('play/' + it.slug, `${appIcon(it)}<div class="card-head"><h4>${esc(it.title)}</h4></div><p>${esc(it.blurb)}</p>
      <div class="meta"><span class="pill ${it.status === 'live' ? 'hot' : ''}">${STATUS[it.status]}</span>${it.tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>`, 'card media');
    return `<div class="wrap">${head(s)}
      <h3 class="sub">Games</h3><div class="grid">${PLAY.filter(x => x.kind === 'Game').map(card).join('')}</div>
      <h3 class="sub">Apps</h3><div class="grid">${PLAY.filter(x => x.kind !== 'Game').map(card).join('')}</div>${foot()}</div>`;
  },

  characters(slug) {
    const s = sectionOf('characters');
    if (slug) {
      const it = ASSETS.find(x => x.slug === slug);
      if (!it) return missing();
      after = () => import('./viewer.js?v=97d84ef4').then(m => { mounted = m.mountViewer($('#viewer'), { url: it.glb, prefer: it.prefer, anim: it.anim }); });
      return `<div class="wrap">${crumbs(link('characters', 'Characters'), esc(it.title))}
        <h2 class="title">${esc(it.title)}</h2>
        <p class="lede">From ${esc(it.from)}. ${it.notes.map(esc).join(' · ')}.</p>
        <div id="viewer" class="viewer"></div>
        <div class="row">${buy(it)}</div>
        <p class="soon">Rigged to a Mixamo-style skeleton, faces +Z, draco-compressed geometry with WebP textures —
          drops straight into three.js with GLTFLoader + DRACOLoader.</p>${foot()}</div>`;
    }
    after = () => { mounted = charPicker(view); };
    return `<div class="wrap">${head(s, ' Every number is read off the file: triangles, joints, clips, size. Optimised, animated and running in real three.js games on phones.')}
      <div class="shelf-figures char-page">${charGroups(charFace)}</div>
      <div class="char-detail">${charDetail(null)}</div>
      <h3 class="sub">Also coming</h3><ul class="soon"><li>3D-printable figures (STL)</li></ul>
      ${GUMROAD ? `<div class="row">${ext(GUMROAD, 'Whole store on Gumroad ↗', 'btn ghost')}</div>` : ''}${foot()}</div>`;
  },

  tutorials(slug) {
    const s = sectionOf('tutorials');
    const vid = t => !t.video ? '' : /youtu/.test(t.video)
      ? `<div class="vidwrap"><iframe src="${esc(t.video.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/'))}" allowfullscreen loading="lazy" title="${esc(t.title)}"></iframe></div>`
      : `<video src="${esc(t.video)}" controls playsinline preload="metadata"></video>`;
    if (slug) {
      const t = TUTORIALS.find(x => x.slug === slug);
      if (!t) return missing();
      return `<div class="wrap narrow">${crumbs(link('tutorials', 'Tutorials'), esc(t.title))}
        <h2 class="title">${esc(t.title)}</h2><p class="lede">${esc(t.blurb)}</p>
        ${vid(t) || '<p class="soon">The video is on its way.</p>'}
        ${(t.files || []).length ? `<h3 class="sub">Free files</h3><div class="row">${t.files.map(f => ext(f.href, '↓ ' + esc(f.label), 'btn ghost')).join('')}</div>` : ''}
        ${support(true)}${foot(false)}</div>`;
    }
    return `<div class="wrap">${head(s, ' Every tutorial comes with its files: the models, the code, the scene. Take them apart.')}
      <div class="grid">${TUTORIALS.map(t => link('tutorials/' + t.slug, `<div class="mono">▶</div><h4>${esc(t.title)}</h4><p>${esc(t.blurb)}</p>
        <div class="meta"><span class="pill">${esc(t.game)}</span>${t.status === 'soon' ? '<span class="pill">Coming soon</span>' : '<span class="pill hot">Free</span>'}</div>`, 'card')).join('')}</div>
      ${support(true)}${foot(false)}</div>`;
  },

  // Assets: everything that is not a character. Nothing is up yet; characters that
  // used to live here have moved, and an old link to one goes straight to it.
  assets(slug) {
    if (slug && ASSETS.some(x => x.slug === slug)) { queueMicrotask(() => { history.replaceState(null, '', BASE + 'characters/' + slug); render(); }); return ''; }
    const s = sectionOf('assets');
    return `<div class="wrap">${head(s)}
      <div class="grid">${[['Buildings', 'Modular, low-draw-call buildings and kits.'], ['Props', 'Street furniture, vehicles, set dressing.'],
        ['Texture packs', 'Tileable, KTX2-ready, sized for phones.'], ['Levels', 'Whole scenes from the games, ready to walk around.']]
        .map(([t, b]) => `<div class="card"><div class="mono">${t[0]}</div><h4>${t}</h4><p>${b}</p><div class="meta"><span class="pill">Coming soon</span></div></div>`).join('')}</div>
      <p class="soon">Everything optimised for three.js on a phone: draco geometry, compressed textures, few draw calls.</p>${foot()}</div>`;
  },

  scripts(slug) {
    const s = sectionOf('scripts');
    if (slug) {
      const it = SCRIPTS.find(x => x.slug === slug);
      if (!it) return missing();
      return `<div class="wrap">${crumbs(link('scripts', 'Scripts'), esc(it.title))}
        <h2 class="title">${esc(it.title)}</h2><p class="lede">${esc(it.blurb)}</p>
        <div class="row">${it.file ? `<a class="btn accent" href="${esc(it.file)}" download>Download</a>` : `<span class="btn accent" aria-disabled="true">Download coming soon</span>`}
          <span class="pill">${esc(it.app)}</span></div>
        ${it.video ? `<p>${ext(it.video, 'Watch the tutorial ↗')}</p>` : ''}${foot()}</div>`;
    }
    return `<div class="wrap">${head(s)}<div class="grid">${SCRIPTS.map(it => link('scripts/' + it.slug,
      `<h4>${esc(it.title)}</h4><p>${esc(it.blurb)}</p><div class="meta"><span class="pill">${esc(it.app)}</span><span class="pill">${STATUS[it.status]}</span></div>`, 'card')).join('')}</div>${foot()}</div>`;
  },

  writing(slug) {
    const s = sectionOf('writing');
    if (slug) {
      const it = WRITING.find(x => x.slug === slug);
      if (!it) return missing();
      after = () => import('./reader.js?v=d5e74f37').then(async m => { mounted = await m.mountReader($('#essay'), it); });
      return `<div class="wrap narrow">${crumbs(link('writing', 'Thoughts'), esc(it.title))}
        <h2 class="title">${esc(it.title)}</h2>${it.note ? `<p class="lede">${esc(it.note)}</p>` : ''}
        <div id="essay"><p class="soon">Loading…</p></div>${foot()}</div>`;
    }
    return `<div class="wrap">${head(s)}<ul class="index">${WRITING.map((it, i) =>
      `<li>${link('writing/' + it.slug, `<i>${String(i + 1).padStart(2, '0')}</i><b>${esc(it.title)}</b><span>${it.reading ? '▶ ' + esc(it.voice || 'Listen') : 'Read'}</span>`)}</li>`).join('')}</ul>
      <p class="soon">More essays on the way.</p>${foot()}</div>`;
  },

  web() {
    const s = sectionOf('web');
    return `<div class="wrap">${head(s)}<div class="grid">${WEB.map(it => {
      const inner = `${cover(it)}<h4>${esc(it.title)}</h4><p>${esc(it.blurb)}</p><div class="meta"><span class="pill">${esc(it.role)}</span></div>`;
      return it.url ? ext(it.url, inner, 'card media') : `<div class="card media">${inner}</div>`;
    }).join('')}</div>${foot()}</div>`;
  },

  studios() {
    const s = sectionOf('studios');
    return `<div class="wrap">${head(s)}<div class="grid">${STUDIOS.map(it => ext(it.url,
      `${cover(it)}<div class="card-head">${thumb(it)}<h4>${esc(it.title)}</h4></div><p>${esc(it.blurb)}</p>`, 'card media')).join('')}</div>${foot()}</div>`;
  },

  motion() {
    const s = sectionOf('motion');
    return `<div class="wrap">${head(s)}<div class="wall">${MOTION.map(m =>
      `<figure><video data-src="${esc(m.src)}" poster="${esc(m.poster)}" muted loop playsinline preload="none"></video><figcaption>${esc(m.title)}</figcaption></figure>`).join('')}</div>${foot()}</div>`;
  },

  workbench() {
    const s = sectionOf('workbench');
    const imgs = list => `<div class="wall light">${list.map(m => `<figure><img src="${esc(m.src)}" alt="${esc(m.title)}" loading="lazy"><figcaption>${esc(m.title)}</figcaption></figure>`).join('')}</div>`;
    return `<div class="wrap">${head(s)}
      <h3 class="sub">Illustration</h3>${imgs(WORKBENCH.illustration)}
      <h3 class="sub">Logos</h3>${imgs(WORKBENCH.logos)}
      <h3 class="sub">On the way</h3><ul class="soon">${WORKBENCH.soon.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${foot()}</div>`;
  },

  // About: him, big, talking -- with the web of what he does orbiting his head.
  about() {
    after = () => mountAbout();
    return `<div class="wrap about">
      <div id="about-hero">
        <div class="about-floor" aria-hidden="true"><i class="plane"></i><i class="pool"></i><i class="shadow"></i></div>
        <div class="about-slot"></div>
        <button class="btn accent about-talk">Talk to me</button></div>
      <h2 class="title">Hi, I'm Colin.</h2>
      <p class="lede">${esc(ABOUT.lede)}</p><p class="about-more">${esc(ABOUT.more)}</p>
      <h3 class="sub">Thoughts</h3>
      <p class="soon">Essays on art, making and whatever else — read them, or let me read them to you.</p>
      <div class="thoughts">${WRITING.map(w => `<div class="thought"><b>${esc(w.title)}</b><q>${esc(w.excerpt || '')}</q>
        <div class="row">${w.reading ? `<button class="btn accent listen" data-slug="${esc(w.slug)}">▶ Listen</button>` : ''}
        ${link('writing/' + w.slug, 'Read', 'btn ghost')}</div></div>`).join('')}</div>
      ${foot()}</div>`;
  },

  audio() {
    const s = sectionOf('audio');
    after = () => mountAudio();
    return `<div class="wrap">${head(s)}
      <div class="player-big"><button class="pb-play" aria-label="Play">▶</button>
        <div class="pb-body"><div class="pb-now"><b>Pick a track</b><span></span></div><canvas class="pb-bars"></canvas>
          <div class="pbar"><i></i></div></div></div>
      <ol class="tracks">${SONGS.map((t, i) => `<li><button data-i="${i}"><i>${String(i + 1).padStart(2, '0')}</i><b>${esc(t.title)}</b><span>${esc(t.from)}</span></button></li>`).join('')}</ol>
      <h3 class="sub">Sound effects</h3>
      <p class="lede">Made or sourced for my games. ${esc(SFX.license)} Tap to hear, arrow to download.</p>
      <div class="row"><a class="btn" href="${esc(SFX.zip)}" download>Download all (.zip, 3.3 MB)</a></div>
      <div class="sfx-filters row"></div><div class="sfx-grid"></div>${foot()}</div>`;
  },
};
const missing = () => `<div class="wrap">${crumbs('Not found')}<h2 class="title">Nothing here</h2>
  <p class="lede">That link points at something that has moved or does not exist yet.</p><div class="row">${link('./', 'Back to the globe', 'btn')}</div></div>`;

// ---- render ---------------------------------------------------------------
let globe = null, mounted = null, after = null, colin = null;
const colinWait = [];
const withColin = f => (colin ? f(colin) : colinWait.push(f));
// The stage behind everything: the particle swarm, or the old globe with ?globe.
const USE_SWARM = !new URLSearchParams(location.search).has('globe');
if (USE_SWARM) document.body.classList.add('swarm');
const GLORB_ON = !new URLSearchParams(location.search).has('noglorb');
function render() {
  mounted?.destroy(); mounted = null; after = null;
  const [sec, slug] = route();
  const page = sec ? PAGES[sec] : PAGES.home;
  document.body.classList.toggle('at-home', !sec);
  document.body.dataset.sec = sec || 'home';
  document.body.classList.toggle('stage-page', sec === 'about' && !slug);   // a full-screen stage above the strip
  view.innerHTML = page ? page(slug) : missing();
  reveal(view);
  view.classList.remove('enter');
  if (!document.startViewTransition || calm.matches) { void view.offsetWidth; view.classList.add('enter'); }
  const s = sectionOf(sec);
  document.title = s ? `${slug ? (slug + ' · ') : ''}${s.label} — ${SITE.name}` : `${SITE.name} — ${SITE.role}`;
  if (sec) scrollTo(0, 0);
  globe?.setMode(sec && s ? 'section' : 'home', s ? sec : null); aisleKey = null;
  globe?.pause?.(!sec && GLORB_ON);   // at home Glorb is the stage
  if (WEAVE) backdrop(sec || pressed || 'home');   // (WEAVE exists only after boot, when the deck is defined)
  pushColors();
  wireVideos();
  after?.();
  if (typeof deckSync === 'function') deckSync();
  // home: Colin stands big in the middle of the hero, presenting; anywhere else he goes back to the strip
  // (About borrows him itself, once its page is built)
  heroSync();
}
// ONE COLIN. On home he stands in the hero presenting; whenever the line-up is up (the
// Characters page, or its key down on home) he is the man in its empty middle seat, and
// moves when the line moves. Anywhere else he goes back to the strip; About borrows him itself.
function heroSync() {
  const sec = route()[0], line = document.body.classList.contains('colin-in-line');
  // every page but About: he is the big Colin on the stage (the strip's wandering little one is retired)
  if (sec !== 'about' || line) withColin(c => { c.adopt(HOMESTAGE); c.present(false); });
}

// Loops only load and play while they are on screen -- 21 autoplaying videos
// at once is what makes a portfolio page crawl on a phone.
let io;
function wireVideos() {
  io?.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '200px' });
  view.querySelectorAll('video[data-src]').forEach(v => io.observe(v));
}

// Mini-Colin ducks out of the way while you scroll down through content, and
// comes back the moment you scroll up.
let lastY = 0;
addEventListener('scroll', () => {
  const y = scrollY;
  document.body.classList.toggle('scrolled', y > 40);
  if (Math.abs(y - lastY) > 12) { document.body.classList.toggle('reading', y > lastY && y > 200); lastY = y; }
  aisleSync();
}, { passive: true });

// Walking the aisle: whichever shelf is across the middle of the screen is what
// the swarm becomes. Back up at the hero it is the orb again.
let aisleKey = null;
function aisleSync() {
  if (!USE_SWARM || !globe || route().length || GLORB_ON) return;
  let key = 'home';
  if (scrollY > innerHeight * 0.45) {
    const mid = innerHeight * 0.5;
    for (const el of document.querySelectorAll('.shelf[id^="shelf-"]')) {
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { key = el.id.slice(6); break; }
    }
    if (key === 'home') key = aisleKey && aisleKey !== 'home' ? aisleKey : 'play';
  }
  if (key === aisleKey) return;
  aisleKey = key;
  globe.setMode(key === 'home' ? 'home' : 'aisle', key === 'home' ? null : key);
}

// ---- tools: theme, accent, sound -------------------------------------------
initTheme();
$('#theme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
{
  const b = $('#accent'); let t = 0, held = false;
  b.addEventListener('pointerdown', () => { held = false; t = setTimeout(() => { held = true; randomAccent(); }, 450); });
  b.addEventListener('pointerup', () => { clearTimeout(t); if (!held) nextPreset(); });
  b.addEventListener('pointerleave', () => clearTimeout(t));
  b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nextPreset(); } });
}

const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
// on a section page the band takes that section's colour (the same one Glorb wears for it), never plain ink
const pushColors = () => {
  const i = SECTIONS.findIndex(s => s.key === route()[0]);
  globe?.setColors({ ink: i >= 0 && USE_SWARM ? sectionColours(i).rim : css(USE_SWARM ? '--ink' : '--globe-ink'), accent: css('--accent'), deep: css('--accent-deep') });
};
onAccent(() => pushColors());

// ---- the hero: the real Glorb ---------------------------------------------
// He lives in his own repo and is embedded whole (glorp/?embed): his own
// palette, his own rest (a quiet room through his real mic analysis) and his
// own flee. Nothing on the page is wired to gestures on him -- the swipe-to-
// navigate version was messy and fired by accident. He is the hero; the row of
// sections under him is the navigation. When the ♪ player is on he dances to it.
/* Glorb's own engine runs IN this page (tools/port-glorb.mjs copies it across
   whole), on one canvas that is the whole screen for the intro and the top of
   the home page after it. One field, every state: nothing is swapped. */
const GLORB = { api: null, ready: false, send: () => {} };
let WEAVE = null;   // the woven band pattern behind him, one per section (weave.js)
/* EACH SECTION'S BACKDROP behind Glorb. Most are the weave; a section can have its
   own instead -- Scripts is code raining past (coderain.js), loaded the first time
   it is needed. One place decides, so the backdrops can never both be showing. */
let RAIN = null, rainLoading = null;
const OWN_BACKDROP = { scripts: 'rain', characters: 'lineup' };
let LINEUP = null, lineupLoading = null;
window.cw = { get GLORB() { return GLORB; }, get LINEUP() { return LINEUP; }, get WEAVE() { return WEAVE; }, get RAIN() { return RAIN; } };   // console handles
const CHARPICK = { show: null, want: null };
// ONE GAME'S CAST AT A TIME on the stage: picking someone from another game sends this lot
// running off and brings theirs on (Colin keeps his seat in the middle)
const CAST = { game: "Zap 'n Clancy" };
document.addEventListener('click', e => { const f = e.target.closest('.game-cast [data-char]'); if (f) { CHARPICK.want = f.dataset.char; castFor(f.dataset.char); } }, true);
function castFor(slug) {
  const g = ASSETS.find(a => a.slug === slug)?.from; if (!g || g === CAST.game) return;
  CAST.game = g;
  if (LINEUP) { const old = LINEUP; old.visible(false); setTimeout(() => old.destroy(), 1000); LINEUP = null; lineupLoading = null; colin && document.body.classList.remove('colin-in-line'); SEAT = null; }
  backdrop(current());
}
/* A GAME'S OWN SCREEN. On a game's page the header is that game: its wide art (gameplay
   footage, when there is some) fills the stage behind Colin, and he turns round to look at it. */
function gameArt(it) { return (it?.gallery || [])[0] || it?.shot || null; }
function gameShown() {
  const r = route(); if (r[0] !== 'play' || !r[1]) return null;
  const it = PLAY.find(x => x.slug === r[1] || x.aliases?.includes(r[1])); return it && gameArt(it) ? it : null;
}
let gameBg = null;
function gameBackdrop() {
  const it = gameShown(), host = $('#glorb');
  if (it && host) {
    const src = `site/shots/${gameArt(it)}.webp`;
    /* The WHOLE frame, never a crop: the art sits at its own shape in the middle of the space
       above the strip, and a blurred, dimmed copy of itself fills round it, so a widescreen shot
       reads as a screen on a tall phone rather than as a close-up of somebody's face. */
    if (!gameBg) {
      gameBg = document.createElement('div'); gameBg.className = 'game-bg';
      gameBg.innerHTML = '<i class="fill"></i><img alt="">'; host.appendChild(gameBg);
    }
    const im = gameBg.querySelector('img');
    if (!im.src.endsWith(src)) {
      gameBg.classList.remove('on');
      im.onload = () => { gameBg.querySelector('.fill').style.backgroundImage = `url("${src}")`; gameBg.classList.add('on'); };
      im.src = src;
    } else gameBg.classList.add('on');
  } else gameBg?.classList.remove('on');
  withColin(c => c.lookBack?.(!!it));
  return !!it;
}
function backdrop(key) {
  key = key || 'home';
  if (gameBackdrop()) { WEAVE?.visible(false); LINEUP?.visible(false); RAIN?.visible(false); return; }
  const own = OWN_BACKDROP[key];
  WEAVE?.set(key);
  WEAVE?.visible(!own || own === 'lineup');                         // the line-up stands in front of a dimmed weave
  WEAVE?.canvas.classList.toggle('dim', own === 'lineup');
  if (own === 'lineup' && !LINEUP && !lineupLoading && GLORB.ready)
    lineupLoading = import('./lineup.js?v=6b21a4f0').then(m => {
      const cast = ASSETS.filter(a => a.from === CAST.game || a.also?.includes(CAST.game)), half = Math.ceil(cast.length / 2);
      LINEUP = m.createLineup($('#glorb'), [...cast.slice(0, half), { slug: 'colin', colin: true, h: 1.9, title: 'Colin', glb: 'models/colin.glb', prefer: ['idle_neutral'] }, ...cast.slice(half)], { onPick: slug => CHARPICK.show?.(slug),
        colin: { place: p => { SEAT = p; }, joined: v => { document.body.classList.toggle('colin-in-line', v); heroSync(); } } });
      LINEUP.game = CAST.game; LINEUP.fog(css('--bg') || '#0e0e0f'); backdrop(current()); });
  LINEUP?.visible(own === 'lineup');
  if (own === 'lineup' && CHARPICK.want) LINEUP?.focus(CHARPICK.want);   // (visible() clears the pick; put it back)
  if (own === 'rain' && !RAIN && !rainLoading && GLORB.ready)
    rainLoading = import('./coderain.js?v=2119d60c').then(m => { RAIN = m.createCodeRain($('#glorb'), () => GLORB.api); backdrop(current()); });
  RAIN?.visible(own === 'rain');
}
const current = () => route()[0] || (route().length ? latched : pressed) || 'home';   // only called after boot
const GLORB_DOT = 0.65;
const glorbTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
if (GLORB_ON) document.body.classList.add('has-glorb');
const glorbReady = GLORB_ON ? import('./glorb/engine.js?v=1d4253d4').then(m => {
  const api = m.createGlorb({ host: $('#glorb'), theme: glorbTheme(), bg: css('--bg') });
  // his dots at 65% of his own app's size: here he is a smaller thing on a busier page
  api.cfg.dot *= GLORB_DOT;
  Object.assign(GLORB, { api, ready: true, send: msg => api.post(msg) });
  import('./weave.js?v=c37c269e').then(w => {
    WEAVE = w.createWeave($('#glorb'), () => GLORB.api);   // Glorb's particles carve the cloth
    WEAVE.theme(glorbTheme() === 'dark');
    onAccent(a => WEAVE.accent(a));          // its yarns are dyed in the site's accent
    backdrop(current());
  }).catch(err => console.warn('weave', err));
  new MutationObserver(() => { api.post({ glorb: 'theme', theme: glorbTheme(), bg: css('--bg') }); WEAVE?.theme(glorbTheme() === 'dark'); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return api;
}).catch(err => { console.warn('glorb unavailable', err); return null; }) : Promise.resolve(null);

/* THE HEAD OF THE HOME PAGE: Glorb and the strip under him, as one unit.
   - Pressing a key keeps them where they are and scrolls the shelves BENEATH
     them to that section, while Glorb forms that section's shape in its colour.
   - Scrolling yourself slides the unit up and away with the page (the strip's
     top edge is a floor in Glorb's physics, so the strip shoves him up and off
     as it goes), and scrolling back brings it back down.
   `anchor` is the scroll position the unit is sitting at: a key sets it, and
   scrolling above it lowers it, so it always reappears on the way back up. */
const HEAD = { anchor: 0, auto: 0, target: 0, sk: 1 };
/* The home hero's Colin: a box over the stage, sized every frame so his feet are on the
   floor (the middle of the strip's top face) and his head is on Glorb's centre. His
   canvas frames him with his soles 9.7% up from its bottom and his head about 84.6% up,
   so the box is (floor - head) / 0.749 tall and hangs that far below his feet. */
let SEAT = null;
const HOMESTAGE = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'home-stage' }));
/* The page's CSS sizes everything in svh (the screen WITH the browser bar showing)
   and innerHeight is the screen as it is right now -- on a phone those differ by
   the height of the URL bar, and mixing them put the strip below where the CSS
   left room for it (it slid over the first shelf) and clipped Glorb short of the
   strip. So the head measures svh itself, off a probe the CSS sizes. */
const svhProbe = document.body.appendChild(Object.assign(document.createElement('div'),
  { style: 'position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none' }));
const svh = () => svhProbe.offsetHeight || innerHeight;
const headRest = () => Math.min(innerWidth * 2 / 3, svh() * 0.72);   // the 3:2 stage, as --band in the CSS
const deckH = () => $('#deck')?.offsetHeight || 58;
function headOffset() {
  if (HEAD.auto) return 0;
  return Math.max(0, Math.min(headRest() + deckH() + 40, scrollY - HEAD.anchor));
}
addEventListener('scroll', () => {
  if (route().length) return;
  if (HEAD.auto) {                                         // a key's scroll: done when it arrives
    if (Math.abs(scrollY - HEAD.target) < 2 || performance.now() > HEAD.auto) HEAD.auto = 0;
    return;
  }
  if (scrollY < HEAD.anchor) HEAD.anchor = Math.max(0, scrollY);
}, { passive: true });
(function headFrame() {
  requestAnimationFrame(headFrame);
  // a key pressed before Glorb was ready asked for the line-up and got nothing: ask again until it comes
  if (WEAVE && !LINEUP && !lineupLoading && GLORB.ready && OWN_BACKDROP[current()] === 'lineup') backdrop(current());
  const home = !route().length, deckEl = $('#deck');
  document.body.classList.toggle('home-head', home && GLORB_ON);
  if (!deckEl) return;
  let top;
  if (home) { top = headRest() - headOffset(); deckEl.style.top = top + 'px'; }
  else { deckEl.style.top = ''; top = deckEl.getBoundingClientRect().top; }
  deckEl.style.setProperty('--stage', Math.max(0, top) + 'px');   // how tall the box above the strip is
  if (gameBg) gameBg.style.height = Math.max(0, top) + 'px';   // a game's screen fills exactly the space above the strip
  const g = $('#glorb'); if (g) g.style.clipPath = `inset(0 0 ${Math.max(0, g.clientHeight - top)}px 0)`;
  const api = GLORB.api; if (!api) return;
  // he rests in the middle of whatever space is above the strip when the page is at the top
  // on a stage page he is the backdrop: bigger, and centred behind Colin's chest and head
  const stage = document.body.classList.contains('stage-page');
  HEAD.sk += ((stage ? 2.8 : 1) - HEAD.sk) * 0.08; api.setScale(HEAD.sk);
  const R = api.centre.scale * 0.34, room = home ? headRest() : stage ? top * 0.76 : top;
  api.setFloor(top - 1);
  // as the strip rises it catches him low, so his underside visibly flattens on it before he goes
  api.setCentreY(Math.min(room * 0.5, top - R * 0.5));
  {
    // sized off the page AT REST, so scrolling only moves him: resizing his canvas every frame
    // as the hero shrank cleared it (the flashing) and shrank him with it
    const lg = parseFloat(css('--ledge')) || 26, rest = headRest(), floor = rest - lg * 0.5;
    const H = Math.round(Math.max(80, (floor - rest * 0.5) / 0.749)), y = Math.round(floor + 0.0968 * H - H);
    if (HOMESTAGE._h !== H) { HOMESTAGE._h = H; HOMESTAGE.style.height = H + 'px'; HOMESTAGE.style.top = y + 'px'; }
    // where he stands: the hero spot (riding the scroll), or the line-up's seat for him, eased
    // between the two so stepping into the line is a move and not a cut
    const foot0 = y + H * 0.9032, px0 = H / 1.24, hx = innerWidth / 2;
    // on home, once you press a key he WALKS over and stands above it -- and follows it if the
    // row of keys is scrolled sideways; nothing pressed (or back at the top), centre stage
    let gx = hx;
    const on = home ? pressed : sectionOf(route()[0]) ? route()[0] : null;   // the key that is down
    // except Characters: there his seat is the middle of the line-up, so walking to the key first
    // only to be pulled back to the centre reads as a teleport -- he just waits where he is
    if (!SEAT && on && on !== 'characters') {
      const kb = deck.querySelector(`.key[data-key="${on}"]`)?.getBoundingClientRect();
      if (kb?.width) gx = Math.max(48, Math.min(innerWidth - 48, kb.left + kb.width / 2));
    }
    const want = SEAT ? { x: SEAT.cx, f: SEAT.foot, k: SEAT.px / px0, lit: SEAT.lit } : { x: gx, f: foot0 + (top - rest), k: 1, lit: 1 };
    const P = HOMESTAGE._p ||= { ...want };
    const now = performance.now(), dt = Math.min(0.05, (now - (HOMESTAGE._t || now)) / 1000); HOMESTAGE._t = now;
    const e = SEAT && HOMESTAGE._seat ? 1 : 0.14;   // in the line he IS the seat; between modes, eased
    for (const n of ['f', 'k', 'lit']) P[n] += (want[n] - P[n]) * e;
    let walk = SEAT?.dir || 0;
    if (SEAT) P.x += (want.x - P.x) * e;
    else {   // a walk, at a walking pace for a man his size on screen -- not a slide
      const d = want.x - P.x, v = 1.5 * (px0 * P.k / 1.85);
      if (Math.abs(d) > 2) { walk = Math.sign(d); P.x += walk * Math.min(Math.abs(d), v * dt); } else P.x = want.x;
    }
    HOMESTAGE._seat = !!SEAT && Math.abs(P.k - want.k) < 0.01 && Math.abs(P.x - want.x) < 1;
    HOMESTAGE.style.transform = `translate(${(P.x - hx).toFixed(1)}px,${(P.f - foot0).toFixed(1)}px) scale(${P.k.toFixed(4)})`;
    HOMESTAGE.style.filter = P.lit < 0.995 ? `brightness(${P.lit.toFixed(3)})` : '';
    colin?.heroWalk?.(walk);
    HOMESTAGE.style.visibility = top < 0 ? 'hidden' : '';   // the strip has gone off the top, and the stage with it
  }
  api.pause(top < -R * 1.5);
  WEAVE?.pause(top < 0); RAIN?.pause(top < 0);
  // they stand in the middle of the strip's top face, not on its front edge
  { const lg = parseFloat(css('--ledge')) || 26; LINEUP?.ground(top - lg * 0.5, lg * 0.5); } LINEUP?.pause(top < 0);
  // the main band runs behind Glorb's resting centre (not his live one, so a squash does not drag the cloth)
  WEAVE?.anchor(room * 0.5);
})();

/* A NEW GLORB FOR EVERY PRESS. The particles are thrown out from his middle,
   and while they fly his own settings -- the same ones his tune panel moves --
   ease to a new variation: the ring's shape (a soft blend of his circle toward
   one of his polygons or his star), how wide the cloud is, how big his core,
   where the dark gap falls, and a turn of the colour wheel. His own physics
   brings them home, so he bounces back into the new look rather than snapping.
   Kept subtle on purpose: still him, a different mood. */
const GVAR = { from: null, to: null, t: 1, last: -1 };
const LOOKS = [
  { shape: 0, bloom: 0.34, split: 0.44, coreR: 0.34, radius: 0.26, hue: 0 },     // himself
  { shape: 0.3, bloom: 0.42, split: 0.40, coreR: 0.30, radius: 0.27, hue: 40 },
  { shape: 4.15, bloom: 0.28, split: 0.47, coreR: 0.38, radius: 0.25, hue: -45 },
  { shape: 5.3, bloom: 0.36, split: 0.42, coreR: 0.28, radius: 0.26, hue: 110 },
  { shape: 6.25, bloom: 0.30, split: 0.46, coreR: 0.36, radius: 0.265, hue: -110 },
  { shape: 0.15, bloom: 0.46, split: 0.38, coreR: 0.40, radius: 0.24, hue: 170 },
  { shape: 3.8, bloom: 0.32, split: 0.45, coreR: 0.32, radius: 0.27, hue: 75 },
];
const hueHex = (hex, deg) => {       // rotate a hex colour round the wheel, keeping its lightness
  let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0; const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = ((h * 60 + deg) % 360 + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [r, g, b].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
};
function glorbShift() {
  const api = GLORB.api; if (!api) return;
  // a burst: every particle thrown outward from his middle, a little differently
  const { px, py, vx, vy } = api.field, { x: cx, y: cy } = api.centre;
  for (let i = 0; i < api.n; i++) {
    const dx = px[i] - cx, dy = py[i] - cy, d = Math.hypot(dx, dy) || 1, k = 3 + Math.random() * 5;
    vx[i] += dx / d * k + (Math.random() - 0.5) * 2; vy[i] += dy / d * k + (Math.random() - 0.5) * 2;
  }
  let pick; do { pick = (Math.random() * LOOKS.length) | 0; } while (pick === GVAR.last && LOOKS.length > 1);
  GVAR.last = pick;
  const c = api.cfg;
  GVAR.from = { shape: c.shape, bloom: c.bloom, split: c.split, coreR: c.coreR, radius: c.radius, hue: GVAR.to ? GVAR.to.hue : 0 };
  GVAR.to = LOOKS[pick]; GVAR.t = 0;
}
(function glorbVary() {
  requestAnimationFrame(glorbVary);
  const api = GLORB.api; if (!api || GVAR.t >= 1) return;
  GVAR.t = Math.min(1, GVAR.t + 1 / 90);
  const e = 1 - Math.pow(1 - GVAR.t, 3), f = GVAR.from, t = GVAR.to, c = api.cfg;
  for (const k of ['shape', 'bloom', 'split', 'coreR', 'radius']) c[k] = f[k] + (t[k] - f[k]) * e;
  const hue = f.hue + (t.hue - f.hue) * e;
  if (Math.abs(hue) < 0.5) api.post({ glorb: 'palette' });
  else api.post({ glorb: 'palette', rim: hueHex('#9a1cf0', hue), core: hueHex('#72ec5c', hue * 0.6) });
})();

// ---- the deck ---------------------------------------------------------------
// The site's navigation is a row of push keys on a bar at the foot of the page,
// like the transport keys on an old cassette deck: press one and it goes down
// and STAYS down (latched) while the one that was down pops back up. On the
// home page the key for whichever shelf you are looking at latches by itself as
// you scroll. Colin lives on top of this bar.
const deck = $('.deck-keys');
// The key names are Colin's lettering, used as a STENCIL: the word is a white-on-clear
// image, applied as a mask, so the key paints it -- quiet by default, lit in the accent
// when it is the section you are on, right in either theme. `ar` is each word's width
// over its height as cut from his strip, so every word keeps the same letter size.
const KEYART = { play: 2.913, assets: 3.038, motion: 2.923, web: 2.625, scripts: 2.971, studios: 2.962, writing: 3.24,
  audio: 2.673, workbench: 3.225, about: 2.647, characters: 3.373, tutorials: 2.951 };
deck.innerHTML = SECTIONS.map(s => KEYART[s.key]
  ? `<a class="key art" href="${s.key}" data-key="${s.key}" aria-label="${esc(s.label)}"><span class="gw"><i class="glyph" style="--art:url(${new URL(`site/keys/${s.key}.webp`, document.baseURI).href});--ar:${KEYART[s.key]}"></i></span></a>`
  : `<a class="key" href="${s.key}" data-key="${s.key}"><b>${esc(s.label)}</b></a>`).join('');
let latched = null;
let pressed = null;   // at home the backdrop follows a key you PRESS, never the scroll -- a nudge
                      // of the page swapping the pattern behind the hero read as a glitch
function latch(key, show = true, press = false) {
  if (press) pressed = key; else if (!key && scrollY < 40 && performance.now() > deckHold) pressed = null;   // really back at the top: the hero's own
  if (key === latched && !press) return;
  latched = key;
  if (!route().length) backdrop(pressed || 'home');
  deck.querySelectorAll('.key').forEach(k => k.classList.toggle('in', k.dataset.key === key));
  const k = key && deck.querySelector(`.key[data-key="${key}"]`);
  if (k && show) { const r = k.getBoundingClientRect(), d = deck.getBoundingClientRect();
    if (r.left < d.left + 20 || r.right > d.right - 20) deck.scrollBy({ left: r.left - d.left - d.width / 2 + r.width / 2, behavior: 'smooth' }); }
}
deck.addEventListener('pointerdown', e => { const k = e.target.closest('.key'); if (k) k.classList.add('down'); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => deck.addEventListener(ev, () => deck.querySelectorAll('.key.down').forEach(k => k.classList.remove('down'))));
deck.addEventListener('click', e => {
  const a = e.target.closest('.key'); if (!a) return;
  e.preventDefault();
  const key = a.dataset.key, shelf = document.getElementById('shelf-' + key);
  latch(key, false, true);
  glorbShift();
  WEAVE?.kick(0, 0, 0.6);
  if (!route().length && shelf) toShelf(shelf);
  else go(key);
});
// the head stays put; the shelves slide up beneath it to this one
function toShelf(shelf) {
  const target = Math.max(0, shelf.getBoundingClientRect().top + scrollY - headRest() - deckH() - 8);
  HEAD.anchor = target; HEAD.target = target; HEAD.auto = performance.now() + 1600;
  deckHold = performance.now() + 1600;
  scrollTo({ top: target, behavior: 'smooth' });
}
let deckHold = 0;
function deckSync() {
  const [sec] = route();
  if (sec) return latch(sectionOf(sec) ? sec : null);
  if (performance.now() < deckHold) return;
  let key = null;
  if (scrollY > 40) {
    // whatever shelf is just under the strip, wherever the strip is right now
    const mid = Math.max(60, (parseFloat($('#deck')?.style.top) || 0) + deckH() + 60);
    for (const el of document.querySelectorAll('.shelf[id^="shelf-"]')) {
      const r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom >= mid) { key = el.id.slice(6); break; }
    }
  }
  latch(key);
}
addEventListener('scroll', deckSync, { passive: true });

// ONE music player for the whole site: the ♪ key, the Audio page and the
// stage all share it, so whatever is playing is what the swarm dances to.
const music = {
  el: null, an: null, buf: null, ctx: null, i: SONGS.length - 1, subs: new Set(),
  init() {
    if (this.el) return;
    this.el = new Audio(); this.el.crossOrigin = 'anonymous'; this.el.preload = 'none';
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = this.ctx.createMediaElementSource(this.el);
    this.an = this.ctx.createAnalyser(); this.an.fftSize = 256; this.buf = new Uint8Array(this.an.frequencyBinCount);
    src.connect(this.an); this.an.connect(this.ctx.destination);
    // Glorb reads the song through his own analysis, which is built for a 2048 FFT
    this.an2 = this.ctx.createAnalyser(); this.an2.fftSize = 2048; this.an2.smoothingTimeConstant = 0.5; src.connect(this.an2);
    this.f2 = new Uint8Array(1024); this.t2 = new Float32Array(2048);
    this.el.onended = () => this.play(this.i + 1);
    ['play', 'pause', 'timeupdate'].forEach(ev => this.el.addEventListener(ev, () => this.emit()));
  },
  async play(i = this.i) {
    this.init(); this.i = (i + SONGS.length) % SONGS.length;
    const src = new URL(SONGS[this.i].src, document.baseURI).href;
    if (this.el.src !== src) this.el.src = src;
    await this.ctx.resume(); this.el.play().catch(() => {}); this.emit();
  },
  toggle() { if (!this.el || this.el.paused) this.play(); else this.el.pause(); },
  get playing() { return !!this.el && !this.el.paused; },
  emit() { $('#sound').setAttribute('aria-pressed', String(this.playing)); colin?.groove?.(this.playing); this.subs.forEach(f => f()); },
};
$('#sound').onclick = () => music.toggle();
const sound = { get el() { return music.el; }, get an() { return music.an; }, get buf() { return music.buf; } };
let lvl = 0;
(function meter() {
  requestAnimationFrame(meter);
  // the real song to Glorb while he is on screen; he falls back to his ghost one when it stops
  // (on every page, not only home: the Audio page's whole point is that he is the visualiser)
  if (GLORB.ready && music.playing && music.an2 && scrollY < innerHeight) {
    music.an2.getByteFrequencyData(music.f2); music.an2.getFloatTimeDomainData(music.t2);
    GLORB.send({ glorb: 'audio', f: music.f2, t: music.t2 });
  }
  if (!globe) return;
  let v = 0;
  if (sound.el && !sound.el.paused) {
    sound.an.getByteFrequencyData(sound.buf);
    for (let i = 0; i < 24; i++) v += sound.buf[i];
    v = Math.max(0, v / (24 * 255) - 0.25) * 1.6;
  }
  lvl += (v - lvl) * 0.25;
  globe.setLevel(lvl);
})();

// ---- About: adopt mini-Colin, orbit the web round his head -------------------
function mountAbout() {
  const hero = $('#about-hero'), slot = hero.querySelector('.about-slot');
  let dead = false;
  withColin(c => { if (!dead) c.adopt(slot); });
  // the button IS the conversation's on/off: Talk to me, and while he is talking, Stop
  const talk = hero.querySelector('.about-talk'); let unwatch = null;
  talk.onclick = () => withColin(c => { if (c.awake) c.sleep(); else c.wake(); });
  withColin(c => { if (!dead) unwatch = c.watch(on => { talk.textContent = on ? 'Stop talking' : 'Talk to me'; talk.classList.toggle('on', on); }); });
  document.querySelectorAll('.listen').forEach(b => b.onclick = async () => {
    const w = WRITING.find(x => x.slug === b.dataset.slug);
    const { speakParts, hush } = await import('./speech.js?v=d7e94a3c');
    if (b.dataset.on) { hush(); b.textContent = '▶ Listen'; delete b.dataset.on; return; }
    const j = await fetch(w.reading).then(r => r.json()), base = new URL(w.reading, document.baseURI);
    b.dataset.on = 1; b.textContent = '❚❚ Stop';
    speakParts(j.parts.map(p => ({ ...p, src: new URL(p.audio, base).href })), { who: 'colin',
      onEnd: () => { b.textContent = '▶ Listen'; delete b.dataset.on; } });
  });
  mounted = { destroy() { dead = true; unwatch?.(); colin?.release(); } };
}

// ---- Audio: the shared player, bars, and the sound-effects pads ----------------
function mountAudio() {
  const view$ = s => view.querySelector(s);
  const btn = view$('.pb-play'), now = view$('.pb-now'), bar = view$('.pbar i'), cv = view$('.pb-bars'), g = cv.getContext('2d');
  const sync = () => {
    const t = SONGS[music.i];
    now.innerHTML = music.el ? `<b>${esc(t.title)}</b><span>${esc(t.from)}</span>` : '<b>Pick a track</b><span></span>';
    btn.textContent = music.playing ? '❚❚' : '▶';
    view.querySelectorAll('.tracks button').forEach(b => b.classList.toggle('on', +b.dataset.i === music.i && !!music.el));
    if (music.el?.duration) bar.style.width = (100 * music.el.currentTime / music.el.duration).toFixed(2) + '%';
  };
  music.subs.add(sync); sync();
  btn.onclick = () => music.toggle();
  view.querySelectorAll('.tracks button').forEach(b => b.onclick = () => (+b.dataset.i === music.i && music.playing ? music.el.pause() : music.play(+b.dataset.i)));
  let dead = false;
  (function draw() {
    if (dead || !cv.isConnected) return;
    requestAnimationFrame(draw);
    const w = cv.clientWidth * devicePixelRatio, h = cv.clientHeight * devicePixelRatio;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    g.clearRect(0, 0, w, h);
    const n = 48, acc = css('--accent');
    g.fillStyle = acc;
    for (let i = 0; i < n; i++) {
      let v = 0.04;
      if (music.playing) { music.an.getByteFrequencyData(music.buf); v = Math.max(0.04, music.buf[Math.floor(i * 1.6)] / 255); }
      const bw = w / n * 0.62, x = i * w / n, bh = v * h;
      g.fillRect(x, h - bh, bw, bh);
    }
  })();
  // pads
  fetch(SFX.index).then(r => r.json()).then(list => {
    const cats = ['All', ...new Set(list.map(x => x.cat))];
    const nice = s => s.replace(/gound/g, 'ground').replace(/\bamo\b/g, 'ammo').replace(/ sound$/i, '').replace(/^RPG/, 'RPG');
    let cur = 'All';
    const filters = view$('.sfx-filters'), grid = view$('.sfx-grid');
    const paint = () => {
      filters.innerHTML = cats.map(c => `<button class="pill ${c === cur ? 'hot' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('');
      grid.innerHTML = list.filter(x => cur === 'All' || x.cat === cur).map(x => `<div class="pad"><button class="pad-play" data-f="${esc(x.file)}">
        <b>${esc(nice(x.name))}</b><span>${esc(x.cat)}</span></button>
        <a class="pad-dl" href="audio/sfx/${esc(x.file)}" download aria-label="Download ${esc(x.name)}">↓</a></div>`).join('');
    };
    paint();
    filters.onclick = e => { const b = e.target.closest('button'); if (b) { cur = b.dataset.c; paint(); } };
    grid.onclick = e => {
      const b = e.target.closest('.pad-play'); if (!b) return;
      const a = new Audio('audio/sfx/' + b.dataset.f); a.play().catch(() => {});
      b.parentElement.classList.remove('hit'); void b.offsetWidth; b.parentElement.classList.add('hit');
    };
  });
  mounted = { destroy() { dead = true; music.subs.delete(sync); } };
}

// ---- boot -----------------------------------------------------------------
render();
const q = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let seen = false; try { seen = !!sessionStorage.getItem('cw.intro'); } catch {}
const wantIntro = !route().length && !q.has('nointro') && (q.has('intro') || (!seen && !reduced));

// The globe loads after the page is already usable, and a failure leaves the page working.
const globeReady = GLORB_ON ? Promise.resolve() : (USE_SWARM ? import('./stage-swarm.js?v=a1ea0ebe').then(m => m.createStage) : import('./globe.js?v=8a9c02ed').then(m => m.createGlobe)).then(make => {
  globe = make({ canvas: $('#globe'), labelLayer: $('#labels'), sections: SECTIONS });
  pushColors();
  const [sec] = route();
  globe.setMode(sec && sectionOf(sec) ? 'section' : 'home', sec || null);
  globe.pause?.(!sec && GLORB_ON);
}).catch(err => { console.warn('globe unavailable', err); document.body.classList.add('no-globe'); });

const intro = wantIntro
  ? import('./intro.js?v=498d850c').then(m => m.playIntro({ build: BUILD, role: SITE.role, bg: css('--bg'), glorb: () => GLORB.api, dotK: GLORB_DOT }))
      .catch(err => console.warn('intro', err))
  : Promise.resolve();

// Mini-Colin: 8 MB of him, so he arrives once everything else has settled.
const KNOWN = [
  `The person is looking at Colin Willow's portfolio website, not the kitchen. It has these sections: ${SECTIONS.map(s => `${s.label} (${s.blurb})`).join('; ')}.`,
  `Games: ${PLAY.filter(p => p.kind === 'Game').map(p => p.title).join(', ')}. Apps: ${PLAY.filter(p => p.kind !== 'Game').map(p => p.title).join(', ')}.`,
  `Characters for sale or download (coming to Gumroad): ${ASSETS.map(a => `${a.title} (${a.clips} animations, ${a.tris} triangles)`).join(', ')}. All are rigged, animated, draco-compressed and made for three.js games on phones.`,
  `Scripts: ${SCRIPTS.map(s => s.title).join(', ')}. Essays: ${WRITING.map(w => w.title).join(', ')}. Studios: SeaWillow (holding company and design studio), Majia (game studio), Unknown (clothing label).`,
  `When they ask to go somewhere on the site the page moves there by itself: answer in ONE short casual sentence and never describe, list or tour what is on the page. Never narrate the site unprompted. Every reply is at most two short sentences, spoken like conversation, with no lists.`,
].join(' ').slice(0, 2900);
const ITEMS = [
  ...PLAY.map(p => ({ title: p.title, path: 'play/' + p.slug })),
  ...ASSETS.map(a => ({ title: a.title, path: 'characters/' + a.slug })),
  ...SCRIPTS.map(s => ({ title: s.title, path: 'scripts/' + s.slug })),
  ...WRITING.map(w => ({ title: w.title, path: 'writing/' + w.slug })),
];
if (!q.has('nocolin')) intro.then(() => new Promise(r => setTimeout(r, 900))).then(() =>
  import('./colin.js?v=98c25a93').then(m => { colin = m.createMiniColin({ go, known: KNOWN, items: ITEMS, pageOf: () => '/' + route().join('/') }); colinWait.forEach(f => f(colin)); }))
  .catch(err => console.warn('mini colin unavailable', err));
