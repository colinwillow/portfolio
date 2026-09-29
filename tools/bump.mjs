// npm run bump -- stamp every script and stylesheet URL with a hash of its CONTENTS.
//
// GitHub Pages lets a browser keep each file for ten minutes, and Safari keeps
// each ES module separately -- so after a push a phone can run the NEW page with
// an OLD module and show a mix of both builds (that is how the globe survived
// the swarm on a phone). A file whose contents changed gets a new URL and is
// fetched; one that didn't keeps its URL and stays cached.
//
// Imports are rewritten to './x.js?v=<hash>'. A module's hash includes its own
// rewritten imports, so a change deep in the tree changes every URL above it;
// the loop runs until nothing moves.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DIRS = ['site', 'lab'];
const files = DIRS.flatMap(d => fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js')).map(f => path.join(ROOT, d, f)));
const hash = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
const IMPORT = /(from\s+|import\(\s*)(['"])(\.{1,2}\/[^'"?]+\.js)(\?v=[0-9a-f]+)?\2/g;

let changed = 0;
for (let pass = 0; pass < 12; pass++) {
  let moved = false;
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const out = src.replace(IMPORT, (m, pre, q, spec) => {
      const target = path.resolve(path.dirname(f), spec);
      if (!fs.existsSync(target) || !target.startsWith(path.join(ROOT, 'site'))) return m;   // vendor stays as is
      return `${pre}${q}${spec}?v=${hash(target)}${q}`;
    });
    if (out !== src) { fs.writeFileSync(f, out); moved = true; changed++; }
  }
  if (!moved) break;
}
// The page itself: app.js and the stylesheet.
for (const page of ['index.html', 'lab/index.html']) {
  const p = path.join(ROOT, page); if (!fs.existsSync(p)) continue;
  const src = fs.readFileSync(p, 'utf8');
  const out = src.replace(/((?:src|href)=")((?:\.\.\/)?(?:site|lab)\/[^"?]+\.(?:js|css))(\?v=[0-9a-f]+)?"/g,
    (m, pre, url) => { const t = path.resolve(path.dirname(p), url); return fs.existsSync(t) ? `${pre}${url}?v=${hash(t)}"` : m; })
    .replace(/(src=")(lab\.js)(\?v=[0-9a-f]+)?"/, (m, pre, url) => `${pre}${url}?v=${hash(path.join(ROOT, 'lab', url))}"`);
  if (out !== src) { fs.writeFileSync(p, out); changed++; }
}
const build = hash(path.join(ROOT, 'site', 'app.js'));
console.log(changed ? `stamped (${changed} writes) · build ${build}` : `nothing changed · build ${build}`);
