import { SITE, SECTIONS, PLAY, ASSETS, SCRIPTS, WEB, STUDIOS, MOTION, WORKBENCH, GUMROAD } from './content.js';
import { onAccent, nextPreset, randomAccent, initTheme, setTheme } from './palette.js';

const BASE = window.BASE || '/';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const view = $('#view');
$('#tagline').textContent = SITE.tagline;

// ---- routing ------------------------------------------------------------
// Every section and item has a real URL, so a tutorial can link straight to
// a script and a shared link lands where it was shared from.
const route = () => location.pathname.slice(BASE.length).replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);

function go(path, push = true) {
  if (push) history.pushState(null, '', BASE + path);
  render();
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
  const u = new URL(a.href);
  if (u.origin !== location.origin) return;
  e.preventDefault();
  go(u.pathname.slice(BASE.length).replace(/^\/+/, ''));
});
addEventListener('popstate', () => render());

// ---- pieces ---------------------------------------------------------------
const link = (href, inner, cls = '') => `<a href="${esc(href)}" data-link class="${cls}">${inner}</a>`;
const ext = (href, inner, cls = '') => `<a href="${esc(href)}" target="_blank" rel="noopener" class="${cls}">${inner}</a>`;
const thumb = it => it.thumb
  ? `<img class="thumb" src="site/thumbs/${esc(it.thumb)}.png" alt="" loading="lazy" width="64" height="64">`
  : `<div class="mono" aria-hidden="true">${esc(it.title[0])}</div>`;
const STATUS = { live: 'Live', dev: 'In development', soon: 'Coming soon' };
const sectionOf = k => SECTIONS.find(s => s.key === k);
const crumbs = (...parts) => `<nav class="crumbs">${[link('./', 'Home'), ...parts].join(' / ')}</nav>`;
const head = (s, extra = '') => `${crumbs(esc(s.label))}<h2 class="title">${esc(s.label)}</h2><p class="lede">${esc(s.blurb)}${extra}</p>`;
const foot = () => `<footer class="foot"><span>© ${new Date().getFullYear()} ${esc(SITE.name)}</span>
  <span>${ext(SITE.github, 'GitHub')} · <a href="classic.html">Previous portfolio</a></span></footer>`;

// ---- pages ----------------------------------------------------------------
const PAGES = {
  home() {
    return `<div class="wrap" id="index"><ul class="index">${SECTIONS.map((s, i) =>
      `<li>${link(s.key, `<i>${String(i + 1).padStart(2, '0')}</i><b>${esc(s.label)}</b><span>${esc(s.blurb)}</span>`)}</li>`).join('')}
      </ul>${foot()}</div>`;
  },

  play(slug) {
    const s = sectionOf('play');
    if (slug) {
      const it = PLAY.find(x => x.slug === slug);
      if (!it) return missing();
      return `<div class="wrap">${crumbs(link('play', 'Play'), esc(it.title))}
        <h2 class="title">${esc(it.title)}</h2><p class="lede">${esc(it.blurb)}</p>
        <div class="row">${ext(it.url, 'Open ' + esc(it.title) + ' ↗', 'btn accent')}
          <span class="pill ${it.status === 'live' ? 'hot' : ''}">${STATUS[it.status]}</span>
          ${it.tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>
        <p class="soon">Screenshots, clips and store badges go here once there are some.</p>${foot()}</div>`;
    }
    const card = it => link('play/' + it.slug, `${thumb(it)}<h4>${esc(it.title)}</h4><p>${esc(it.blurb)}</p>
      <div class="meta"><span class="pill ${it.status === 'live' ? 'hot' : ''}">${STATUS[it.status]}</span>${it.tags.map(t => `<span class="pill">${esc(t)}</span>`).join('')}</div>`, 'card');
    return `<div class="wrap">${head(s)}
      <h3 class="sub">Games</h3><div class="grid">${PLAY.filter(x => x.kind === 'Game').map(card).join('')}</div>
      <h3 class="sub">Apps</h3><div class="grid">${PLAY.filter(x => x.kind !== 'Game').map(card).join('')}</div>${foot()}</div>`;
  },

  assets(slug) {
    const s = sectionOf('assets');
    const specs = it => `<dl class="specs">
      ${it.tris ? `<dt>Tris</dt><dd>${esc(it.tris)}</dd>` : ''}
      <dt>Joints</dt><dd>${esc(it.joints)}</dd><dt>Clips</dt><dd>${esc(it.clips)}</dd>
      <dt>From</dt><dd>${esc(it.from)}</dd></dl>`;
    const buy = it => {
      const href = it.gumroad || '';
      return href ? ext(href, (it.price ? esc(it.price) + ' · ' : '') + 'Get it on Gumroad ↗', 'btn accent')
                  : `<span class="btn accent" aria-disabled="true">Coming to Gumroad</span>`;
    };
    if (slug) {
      const it = ASSETS.find(x => x.slug === slug);
      if (!it) return missing();
      return `<div class="wrap">${crumbs(link('assets', 'Assets'), esc(it.title))}
        <h2 class="title">${esc(it.title)}</h2>${specs(it)}
        <ul class="soon">${it.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
        <div class="row">${buy(it)}</div>
        <p class="soon">A live 3D preview with a clip picker lands here next.</p>${foot()}</div>`;
    }
    return `<div class="wrap">${head(s, ' Every number is measured off the file: triangles, joints, clips, texture size. Optimised, animated and tested in real three.js games on phones.')}
      <div class="grid">${ASSETS.map(it => link('assets/' + it.slug, `<div class="mono">${esc(it.title[0])}</div>
        <h4>${esc(it.title)}</h4>${specs(it)}<div class="meta">${it.notes.slice(0, 2).map(n => `<span class="pill">${esc(n)}</span>`).join('')}</div>`, 'card')).join('')}</div>
      <h3 class="sub">Also coming</h3><ul class="soon"><li>3D-printable figures (STL)</li><li>Texture packs</li></ul>
      ${GUMROAD ? `<div class="row">${ext(GUMROAD, 'Whole store on Gumroad ↗', 'btn ghost')}</div>` : ''}${foot()}</div>`;
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

  web() {
    const s = sectionOf('web');
    return `<div class="wrap">${head(s)}<div class="grid">${WEB.map(it => {
      const inner = `<div class="mono">${esc(it.title[0])}</div><h4>${esc(it.title)}</h4><p>${esc(it.blurb)}</p><div class="meta"><span class="pill">${esc(it.role)}</span></div>`;
      return it.url ? ext(it.url, inner, 'card') : `<div class="card">${inner}</div>`;
    }).join('')}</div>${foot()}</div>`;
  },

  studios() {
    const s = sectionOf('studios');
    return `<div class="wrap">${head(s)}<div class="grid">${STUDIOS.map(it => ext(it.url,
      `${thumb(it)}<h4>${esc(it.title)}</h4><p>${esc(it.blurb)}</p>`, 'card')).join('')}</div>${foot()}</div>`;
  },

  motion() {
    const s = sectionOf('motion');
    return `<div class="wrap">${head(s)}<div class="wall">${MOTION.map(m =>
      `<figure><video data-src="${esc(m.src)}" muted loop playsinline preload="none"></video><figcaption>${esc(m.title)}</figcaption></figure>`).join('')}</div>${foot()}</div>`;
  },

  workbench() {
    const s = sectionOf('workbench');
    const imgs = list => `<div class="wall light">${list.map(m => `<figure><img src="${esc(m.src)}" alt="${esc(m.title)}" loading="lazy"><figcaption>${esc(m.title)}</figcaption></figure>`).join('')}</div>`;
    return `<div class="wrap">${head(s)}
      <h3 class="sub">Illustration</h3>${imgs(WORKBENCH.illustration)}
      <h3 class="sub">Logos</h3>${imgs(WORKBENCH.logos)}
      <h3 class="sub">On the way</h3><ul class="soon">${WORKBENCH.soon.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${foot()}</div>`;
  },

  about() {
    const s = sectionOf('about');
    return `<div class="wrap">${head(s)}
      <p>I make games, rigged characters, tools, motion and brands — and most of it ends up running in a browser on a phone.</p>
      <p class="soon">A talking mini-me who can show you around is being moved in. For now: ${ext(SITE.github, 'GitHub')}.</p>${foot()}</div>`;
  },
};
const missing = () => `<div class="wrap">${crumbs('Not found')}<h2 class="title">Nothing here</h2>
  <p class="lede">That link points at something that has moved or does not exist yet.</p><div class="row">${link('./', 'Back to the globe', 'btn')}</div></div>`;

// ---- render ---------------------------------------------------------------
let globe = null;
function render() {
  const [sec, slug] = route();
  const page = sec ? PAGES[sec] : PAGES.home;
  document.body.classList.toggle('at-home', !sec);
  view.innerHTML = page ? page(slug) : missing();
  view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter');
  const s = sectionOf(sec);
  document.title = s ? `${slug ? (slug + ' · ') : ''}${s.label} — ${SITE.name}` : SITE.name;
  if (sec) scrollTo(0, 0);
  globe?.setMode(sec && s ? 'section' : 'home', s ? sec : null);
  wireVideos();
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

addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 40), { passive: true });

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
const pushColors = () => globe?.setColors({ ink: css('--globe-ink'), accent: css('--accent'), deep: css('--accent-deep') });
onAccent(() => pushColors());

// Music drives the globe: loudness swells the ribbons and the dots.
const sound = { el: null, an: null, buf: null };
$('#sound').onclick = async () => {
  const btn = $('#sound');
  if (!sound.el) {
    sound.el = new Audio('audio/Yoga_Pants.mp3'); sound.el.loop = true; sound.el.crossOrigin = 'anonymous';
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaElementSource(sound.el);
    sound.an = ctx.createAnalyser(); sound.an.fftSize = 256; sound.buf = new Uint8Array(sound.an.frequencyBinCount);
    src.connect(sound.an); sound.an.connect(ctx.destination); sound.ctx = ctx;
  }
  if (sound.el.paused) { await sound.ctx.resume(); sound.el.play(); btn.setAttribute('aria-pressed', 'true'); }
  else { sound.el.pause(); btn.setAttribute('aria-pressed', 'false'); }
};
let lvl = 0;
(function meter() {
  requestAnimationFrame(meter);
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

// ---- boot -----------------------------------------------------------------
render();
// The globe loads after the page is already usable, and a failure leaves the page working.
import('./globe.js').then(({ createGlobe }) => {
  globe = createGlobe({ canvas: $('#globe'), labelLayer: $('#labels'), sections: SECTIONS });
  pushColors();
  const [sec] = route();
  globe.setMode(sec && sectionOf(sec) ? 'section' : 'home', sec || null);
}).catch(err => { console.warn('globe unavailable', err); document.body.classList.add('no-globe'); });

