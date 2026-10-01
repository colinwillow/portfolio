// Everything the site says lives here. The pages render from it, and (later)
// mini-Colin reads it too, so the two can never disagree about what is on the site.
//
// To add something: add an entry to the right list. `slug` becomes its URL
// (colinwillow.com/<section>/<slug>), so do not rename a slug once it has been
// linked from a video description.

// Your Gumroad profile, e.g. 'https://colinwillow.gumroad.com'. Empty = the
// buy/download buttons stay hidden rather than pointing nowhere.
export const GUMROAD = '';
/* SUPPORT. Everything here is free; this is the "if it helped you, buy me a coffee"
   link. Paste your page's address in `url` (Buy Me a Coffee, Ko-fi, GitHub Sponsors --
   any of them works) and the support card goes live on every page. Empty = the card
   says it is coming rather than linking nowhere. */
/* SOCIALS, for the support card and the footer. Paste a link and its button appears;
   empty ones stay hidden, so nothing ever links nowhere. */
export const SOCIALS = [
  { key: 'youtube',   label: 'Subscribe on YouTube', short: 'YouTube',   url: '' },
  { key: 'instagram', label: 'Follow on Instagram',  short: 'Instagram', url: '' },
  { key: 'tiktok',    label: 'Follow on TikTok',     short: 'TikTok',    url: '' },
  { key: 'github',    label: 'Star it on GitHub',    short: 'GitHub',    url: 'https://github.com/colinwillow' },
];
export const SUPPORT = { url: '', label: 'Buy me a coffee', note: 'Everything on this site is free: the games, the code, the models, the tutorials. If any of it was useful, here is how to help, free or otherwise. Anything helps.' };

export const GH = 'https://colinwillow.github.io/';

export const SITE = {
  name: 'Colin Willow',
  role: '3D Artist & Game Developer',
  tagline: 'Games, characters, tools and strange little worlds.',
  github: 'https://github.com/colinwillow',
};

// The globe's labels. `lat`/`lon` are where each sits on the sphere (degrees),
// `tier` sets how big it is: 1 = the main three, 2 = supporting, 3 = the rest.
export const SECTIONS = [
  { key: 'play',      label: 'Games',      tier: 1, lat:  18, lon:  -20, blurb: 'Games and web apps you can open right now.' },
  { key: 'characters', label: 'Characters', tier: 1, lat: -22, lon:   40, blurb: 'Rigged, animated characters built for web and mobile games.' },
  { key: 'assets',    label: 'Assets',    tier: 2, lat: -12, lon:   75, blurb: 'Buildings, props, texture packs and whole levels, optimised for three.js.' },
  { key: 'scripts',   label: 'Scripts',   tier: 1, lat:  38, lon:  100, blurb: 'Cinema 4D and pipeline scripts from the tutorials.' },
  { key: 'web',       label: 'Web',       tier: 2, lat: -40, lon:  150, blurb: 'Sites built for brands and friends.' },
  { key: 'motion',    label: 'Motion',    tier: 2, lat:   8, lon: -120, blurb: 'CGI loops, logo reveals, character tests.' },
  { key: 'studios',   label: 'Studios',   tier: 2, lat:  52, lon:  -70, blurb: 'SeaWillow, Majia and Unknown.' },
  { key: 'writing',   label: 'Thoughts',   tier: 2, lat:  30, lon:  165, blurb: 'Essays about art and making, read aloud.' },
  { key: 'audio',     label: 'Audio',     tier: 2, lat: -30, lon:  -95, blurb: 'Game soundtracks, and free sound effects to download.' },
  { key: 'workbench', label: 'Illustrations', tier: 3, lat: -55, lon:  -30, blurb: 'Illustration, logos, and everything made by hand.' },
  { key: 'tutorials', label: 'Tutorials', tier: 1, lat:  45, lon:  130, blurb: 'How the games and characters are made, step by step. Free, with the files.' },
  { key: 'about',     label: 'Colin',     tier: 3, lat:  -8, lon: -170, blurb: 'Who made this.' },
];

// ORDER MATTERS: most developed first (Colin's ranking). status: 'live' | 'dev' (playable but in development) | 'soon'
export const PLAY = [
  { slug: 'robits', icon: 'robits', shot: 'robits', title: 'Robits Neon Blast', kind: 'Game', status: 'dev', thumb: 'robits',
    url: GH + 'robits/', tags: ['three.js', 'twin-stick'],
    blurb: 'Neon robot arena shooter with wall-crawling and crazy gravity. The first Majia title.' },
  { slug: 'weirdport', icon: 'zap-n-clancy', aliases: ['melee', 'zap-n-clancy'], shot: 'zap-n-clancy-key', gallery: ['zap-n-clancy-key'],
    title: "Zap 'n Clancy", kind: 'Game', status: 'dev', thumb: 'weirdport',
    url: GH + 'weirdport/', tags: ['three.js', 'twin-stick', 'open city'],
    blurb: 'Zap and his alien dog Clancy loose in Weirdport, a toon Portland: blaster, hammer, a DNA gun that turns you into whoever you shoot, skateboarding and buildings that come apart.' },
  { slug: 'plutopia', icon: 'plutopia', shot: 'plutopia', gallery: [], title: 'Plutopia', kind: 'Game', status: 'dev', thumb: 'plutopia',
    url: GH + 'plutopia/', tags: ['three.js', 'mobile'],
    blurb: 'A tiny painted planet with a toon alien, a flyable ship with articulated jets and landing gear, and a claw.' },
  { slug: 'shredworld', icon: 'shredworld', shot: 'shredworld', gallery: ['shredworld-key'], title: 'Shredworld', kind: 'Game', status: 'dev', thumb: 'shredworld',
    url: GH + 'city/', tags: ['three.js', 'mobile', 'open world'],
    blurb: 'Skate an open low-poly city. Board tricks, grinds, ladders, a jetpack, a blaster, the police, and a ship you can fly off a rooftop.' },
  { slug: 'rollergirl', icon: 'rollergirl-2', shot: 'rollergirl', title: 'Rollergirl', kind: 'Game', status: 'dev',
    url: GH + 'rollergirl/', tags: ['three.js', 'skate park'],
    blurb: 'Rollerblading in a procedural park: half pipes, a bowl, kickers and real transition physics.' },
  { slug: 'peggy', icon: 'peggy', shot: 'peggy', title: 'Peggy', kind: 'Game', status: 'dev', thumb: 'peggy',
    url: GH + 'peggy/', tags: ['three.js', 'adventure'],
    blurb: 'A cyclops-octopus pirate with a hook for a hand and a peg for a leg — and a game built around both.' },
  { slug: 'portland', icon: 'portland', shot: 'portland', title: 'Portland', kind: 'Game', status: 'dev',
    url: GH + 'portland/', tags: ['three.js', 'open data'],
    blurb: 'A walkable Portland built from open map data — streets, bridges, crowds, traffic and boats on the Willamette.' },
  { slug: 'colin', shot: 'colin', title: 'Talk to Colin', kind: 'App', status: 'dev',
    url: GH + 'colin/', tags: ['voice', 'AI'],
    blurb: 'A rigged mini-me in a baked kitchen. Push to talk and he answers in my voice, lip-synced.' },
  { slug: 'glorb', icon: 'glorb', shot: 'glorb', title: 'Glorb', kind: 'App', status: 'live', thumb: 'glorb',
    url: GH + 'glorp/', tags: ['audio', 'voice'],
    blurb: 'An audio-reactive particle orb you can talk to.' },
];

// Off the site until they are further along. Move one back into PLAY to show it again.
export const PARKED = [
  { slug: 'sky', shot: 'sky', title: 'Sky', kind: 'Game', status: 'dev',
    url: GH + 'sky/', tags: ['three.js', 'planets'],
    blurb: 'Procedural planets you can walk on and fly between, with a scattered-light sky.' },
  { slug: 'eye', icon: 'eye', title: 'Eye', kind: 'App', status: 'live', thumb: 'eye',
    url: GH + 'eye/', tags: ['camera', 'experiment'],
    blurb: 'Eye tracking off a phone\'s front camera. Calibrate, then paint with your eyes.' },
];

// Characters. Every number was read off the GLB itself (the viewer re-measures
// it live in the browser). `glb` is the preview file in models/assets/; `price`
// stays '' until decided; `gumroad` is the product link once it exists.
/* Characters (the section is CHARACTERS; the export keeps its old name). `h` is how tall
   each one stands in the line-up, in metres, so Clancy is a dog and the warrior looms. */
export const ASSETS = [
  { slug: 'zap', h: 1.75, title: 'Zap', from: "Zap 'n Clancy", glb: 'models/assets/zap.glb', mb: 4.1,
    tris: 11059, joints: 62, clips: 61, prefer: ['idle_01'],
    notes: ['61 clips: parkour, ledges, melee, rifle, skateboard', 'Weapon mounts on both hands', 'Draco + WebP, one material'] },
  { slug: 'alien-warrior', h: 2.05, title: 'Alien Warrior', from: "Zap 'n Clancy", glb: 'models/assets/alien_warrior.glb', mb: 4.0,
    tris: 11071, joints: 59, clips: 52, prefer: ['standing_idle'],
    notes: ['Full melee combat set, blocks and hit reactions', 'Weapon mount for the mace', 'Draco + WebP'] },
  { slug: 'purple-alien', h: 1.75, title: 'Purple Alien', from: "Zap 'n Clancy", glb: 'models/assets/alien_female_purple.glb', mb: 1.4,
    tris: 10966, joints: 193, clips: 3, prefer: ['idle_01'],
    notes: ['Hair and tail chains, ready for secondary motion', 'Single 2K texture'] },
  { slug: 'hick', h: 1.8, title: 'Skinny Hick', from: "Zap 'n Clancy", glb: 'models/assets/hick_skinny.glb', mb: 2.1,
    tris: 10785, joints: 66, clips: 23, prefer: ['drunk_idle'],
    notes: ['Sober and drunk locomotion sets', 'Cigarette-tip joint for smoke'] },
  { slug: 'hobo', h: 1.75, title: 'Hobo', from: "Zap 'n Clancy", glb: 'models/assets/hobo_01.glb', mb: 2.5,
    tris: 10318, joints: 65, clips: 29, prefer: ['drunk_idle'],
    notes: ['Hit reactions, knock-down and get-up', 'In-air pose for launches'] },
  { slug: 'clancy', h: 0.85, title: 'Clancy', from: "Zap 'n Clancy", glb: 'models/assets/clancy.glb', mb: 1.5,
    tris: 11035, joints: 27, clips: 36, prefer: ['clancy_idle_01'],
    notes: ['Zap\'s alien dog sidekick', 'Attack, fall, roll and hard-landing clips'] },
  { slug: 'construction-worker', h: 1.82, title: 'Construction Worker', from: "Zap 'n Clancy", glb: 'models/assets/contruction_worker.glb', mb: 1.7,
    tris: 10894, joints: 68, clips: 16, prefer: ['idle'],
    notes: ['Tool swings, vehicle enter/exit, knock-downs', 'Weapon mount for tools'] },
  { slug: 'roller-alien', h: 1.6, title: 'Roller Alien', from: "Zap 'n Clancy", glb: 'models/assets/alien_rollerskate_blue.glb', mb: 1.2,
    tris: 10000, joints: 65, clips: 12, prefer: ['idle'],
    notes: ['Walk, run, strafe and turn set'] },
  // the rest of Zap 'n Clancy's street. Rigged but most unanimated in the file: they borrow
  // the idle, walk and run of a rig with the same build (`anim`): the fat Biker's for the big ones, the Hick's for the slim so they stand like people instead of in a T-pose
  { slug: 'officer', h: 1.82, title: 'Officer', from: "Zap 'n Clancy", also: ['Shredworld'], glb: 'models/assets/police_officer_toon.glb', mb: 1.2,
    tris: 6875, joints: 59, clips: 15, prefer: ['idle_01'],
    notes: ['Also the police in Shredworld', 'Draw, shoot, hit reactions, knock-down and get-up', 'Pistol on a weapon joint'] },
  { slug: 'biker', h: 1.8, title: 'Biker', from: "Zap 'n Clancy", glb: 'models/assets/fat_biker_02.glb', mb: 1.4,
    tris: 10562, joints: 65, clips: 15, prefer: ['idle'],
    notes: ['Driving, hit reactions, fall and get-up', 'Fans himself when idle'] },
  { slug: 'biker-2', h: 1.8, title: 'Biker II', from: "Zap 'n Clancy", glb: 'models/assets/fat_biker_01.glb', anim: 'models/assets/fat_biker_02.glb', mb: 0.3,
    tris: 10316, joints: 66, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'activist', h: 1.75, title: 'Activist', from: "Zap 'n Clancy", glb: 'models/assets/fat_activist_01.glb', anim: 'models/assets/fat_biker_02.glb', mb: 0.2,
    tris: 10578, joints: 65, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'hippie', h: 1.75, title: 'Hippie', from: "Zap 'n Clancy", glb: 'models/assets/fat_hippie.glb', anim: 'models/assets/fat_biker_02.glb', mb: 0.3,
    tris: 10220, joints: 66, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'hipster', h: 1.75, title: 'Hipster', from: "Zap 'n Clancy", glb: 'models/assets/fat_hipster.glb', anim: 'models/assets/fat_biker_02.glb', mb: 0.2,
    tris: 10113, joints: 66, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'secret-service', h: 1.85, title: 'Secret Service', from: "Zap 'n Clancy", glb: 'models/assets/fat_secret_service.glb', anim: 'models/assets/fat_biker_02.glb', mb: 0.1,
    tris: 5298, joints: 66, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'trump', h: 1.85, title: 'Trump', from: "Zap 'n Clancy", glb: 'models/assets/fat_trump.glb', anim: 'models/assets/fat_biker_02.glb', mb: 0.1,
    tris: 4402, joints: 66, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'firefighter', h: 1.82, title: 'Firefighter', from: "Zap 'n Clancy", glb: 'models/assets/firefighter.glb', anim: 'models/assets/fat_biker_02.glb', mb: 0.3,
    tris: 10897, joints: 66, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'blonde', h: 1.7, title: 'Blonde', from: "Zap 'n Clancy", glb: 'models/assets/beautiful_blonde.glb', anim: 'models/assets/hick_skinny.glb', mb: 0.2,
    tris: 11095, joints: 66, clips: 0, prefer: ['idle'], notes: ['Rigged, ready for the shared clip set'] },
  { slug: 'brunette', h: 1.7, title: 'Brunette', from: "Zap 'n Clancy", glb: 'models/assets/beautiful_asian.glb', anim: 'models/assets/hick_skinny.glb', mb: 0.3,
    tris: 10320, joints: 66, clips: 1, prefer: ['idle'], notes: ['A walk of her own; the rest of the set shared'] },
  // Plutopia
  { slug: 'zorp', h: 1.45, title: 'Zorp', from: 'Plutopia', also: ['Shredworld'], glb: 'models/assets/alien_orange.glb', mb: 2.3,
    tris: 14416, joints: 68, clips: 29, prefer: ['idle'],
    notes: ['Plutopia\'s hero, and a playable skater in Shredworld', 'Rifle, melee, swim, throw and roll sets', 'Weapon joints on the hands'] },
  { slug: 'poacher', h: 1.6, title: 'Alien Poacher', from: 'Plutopia', glb: 'models/assets/alien_poacher_01.glb', mb: 1.2,
    tris: 4494, joints: 50, clips: 14, prefer: ['idle_01'],
    notes: ['Hit reactions, in-air leans, laying and getting up', 'An injured hobble'] },
  { slug: 'poacher-2', h: 1.7, title: 'Alien Poacher II', from: 'Plutopia', glb: 'models/assets/alien_poacher_02.glb', mb: 1.6,
    tris: 5205, joints: 54, clips: 14, prefer: ['idle_01'],
    notes: ['The same clip set as his partner, a different build'] },
  // Shredworld
  { slug: 'moussa', h: 1.75, title: 'Moussa', from: 'Shredworld', glb: 'models/assets/moussa_toon.glb', mb: 6.6,
    tris: 18314, joints: 68, clips: 46, prefer: ['idle_neutral'],
    notes: ['Skate, rifle, dances, flips and falls', 'Shares Colin\'s bind pose exactly'] },
  { slug: 'rollergirl', h: 1.7, title: 'Rollergirl', from: 'Rollergirl', glb: 'models/assets/roller_girl.glb', mb: 1.4,
    tris: 9857, joints: 66, clips: 5, prefer: ['coasting', 'idle'],
    notes: ['Skating and jump clips', 'Draco + WebP'] },
].map(a => ({ gumroad: '', price: '', ...a }));

// Essays. `reading` is optional -- without one the page is just the text.
// See writing/README.md for how a reading is made.
export const WRITING = [
  { slug: 'art-has-two-lives', title: 'Art Has Two Lives', text: 'writing/art-has-two-lives.md',
    reading: 'writing/art-has-two-lives.json', voice: 'Read by Colin',
    excerpt: 'Most criticism of AI in art misses one thing: art has two lives.', note: 'A short opening; the full essay is on its way.' },
];

// Scripts. Slugs exist before the files do so tutorial links can go out early.
/* Tutorials: each one breaks down a piece of a game, with the files free to download.
   { slug, title, game, blurb, video (YouTube/mp4 url), files: [{ label, href }], status: 'live' | 'soon' } */
export const TUTORIALS = [
  { slug: 'rigged-character-to-threejs', title: 'From a rigged character to a phone game', game: "Zap 'n Clancy", status: 'soon',
    blurb: 'Mixamo rig, draco + WebP, one material, and the clip set that makes a character feel good under two thumbs.' },
  { slug: 'particle-orb', title: 'Building Glorb', game: 'Glorb', status: 'soon',
    blurb: 'A sound-reactive particle orb in plain canvas: rings, shapes, and the physics that makes it breathe.' },
  { slug: 'breakable-buildings', title: 'Buildings that come apart', game: "Zap 'n Clancy", status: 'soon',
    blurb: 'Chunked walls, oriented-box colliders and debris, batched so a whole street is a handful of draw calls.' },
];

export const SCRIPTS = [
  { slug: 'arp-to-mixamo', title: 'Auto-Rig Pro → Mixamo', app: 'Cinema 4D', status: 'soon',
    blurb: 'Converts an Auto-Rig Pro rig to Mixamo naming so Mixamo clips and web retargeting just work.', file: '', video: '' },
  { slug: 'fbx-to-takes', title: 'FBX files → Takes', app: 'Cinema 4D', status: 'soon',
    blurb: 'Imports a folder of FBX animations into one document, one clip per take, ready to export.', file: '', video: '' },
];

export const WEB = [
  { slug: 'thatswassupps', shot: 'web-thatswassupps', logo: 'logos/thatswassupps_logo_512px.jpg.jpg', title: 'Thatswassupps', url: 'https://thatswassupps.com', role: 'Site and brand work',
    blurb: 'A friend\'s company I ended up helping build.' },
  { slug: 'unknown', shot: 'unknown-key', title: 'Unknown — SS25', url: GH + 'unknown/', role: 'Storefront',
    blurb: 'Product drops for my clothing label.' },
  { slug: 'faith', shot: 'web-faith', title: 'Faith Udall', url: 'https://faithudall.com', role: 'Personal site',
    blurb: 'A personal site for Faith.' },
];

export const STUDIOS = [
  { slug: 'seawillow', title: 'SeaWillow', url: GH + 'seawillow/', blurb: 'Holding company and design studio.' },
  { slug: 'majia', shot: 'studio-majia', title: 'Majia', url: GH + 'majia/', thumb: 'majia', blurb: 'Game studio. Makers of Robits.' },
  { slug: 'unknown', shot: 'unknown-key', title: 'Unknown', url: GH + 'unknown/', blurb: 'Clothing label.' },
];

const MOTION_FILES = [
  '1_motion_man_chair', '2_motion_alien_dj', '3_motion_brain_vat', '4_motion_nike_shoe', '5_motion_pepsi_snow',
  '6_motion_nike_logo', '7_motion_crush_goo', '8_motion_cwd_logo', '9_motion_color_orb', '10_motion_swirl_soda',
  '11_motion_looping_balls', '12_motion_donut_spin', '13_motion_alien_waving', '14_motion_cow', '15_motion_alien_drinking',
  '16_motion_delorean_rs', '17_motion_robot_world', '18_motion_sylk', '19_motion_splash_ball', '20_motion_monster_forest',
  '20_motion_xbox',
];
const pretty = f => f.replace(/^\d+_(motion|illl?ustration)_/, '').replace(/_/g, ' ');
// motion/web/ holds 720px, silent, fast-start copies (54 MB -> 8 MB); the
// originals stay in motion/ because classic.html links them.
export const MOTION = MOTION_FILES.map(f => ({ src: 'motion/web/' + f + '.mp4', poster: 'motion/posters/' + f + '.webp', title: pretty(f) }));

const ILLUS = ['1_illlustration_faith.JPG', '2_illlustration_megan.jpg', '3_illustration_colin_graffiti.jpg',
  '4_illustration_buck.jpg', '6_illustration_bobcat.jpg', '9_illustration_owl.jpg', '10_illustration_faith_dress.jpg',
  '11_illustration_brooke.jpg', '12_illustration_sari.jpg', '14_illustration_faith_robe.jpg',
  '15_illustration_colin_headphones.jpg', '16_illustration_winky.jpg', '17_illustration_zoe.JPG'];
const LOGOS = ['logo_colin_willow_512px.jpg.jpg', 'logo_colin_willow_design_512px.jpg.jpg', 'logo_majia__512px.jpg.JPG',
  'logo_unknown_512px.jpg.JPG', 'thatswassupps_logo_512px.jpg.jpg', 'logo_entheos_512px_02.jpg.JPG',
  'logo_higherlevel_01_512px.jpg.jpg', 'logo_higherlevel_02_512px.jpg.JPG', 'logo_higherlevel_03_512px.jpg.JPG',
  'logo_osiris_01_512px.jpg.jpg', 'logo_osiris_black_512px.jpg.jpg', 'logo_unauthorized_512px.jpg.JPG',
  'logo_vvolt_512px.jpg.png', 'logo_guy_512px.jpg.png'];

export const WORKBENCH = {
  illustration: ILLUS.map(f => ({ src: 'illustrations/' + f, title: pretty(f.replace(/\.\w+$/, '')) })),
  logos: LOGOS.map(f => ({ src: 'logos/' + f, title: f.replace(/^logo_|_512px.*$/g, '').replace(/_/g, ' ') })),
  // Crafts with nothing uploaded yet. Shown as a quiet list, not empty tiles.
  soon: ['Ceramics', 'Laser cutting', '3D-printed figures (STL downloads)', 'Photography', 'Branding'],
};

// Songs stream from the games' own repos, so there is one copy of each file.
export const SONGS = [
  { title: 'Robits Theme', from: 'Robits', src: GH + 'robits/audio/robits_theme_song.mp3.mp3' },
  { title: 'Overdrive', from: 'Robits', src: GH + 'robits/audio/robits_song_overdrive.mp3.mp3' },
  { title: 'Robits III', from: 'Robits', src: GH + 'robits/audio/robits_song_03.mp3' },
  { title: 'Plutopia I', from: 'Plutopia', src: GH + 'plutopia/audio/plutopia_song_01.mp3' },
  { title: 'Plutopia II', from: 'Plutopia', src: GH + 'plutopia/audio/plutopia_song_02.mp3' },
  { title: 'Plutopia III', from: 'Plutopia', src: GH + 'plutopia/audio/plutopia_song_03.mp3' },
  { title: 'Plutopia IV', from: 'Plutopia', src: GH + 'plutopia/audio/plutopia_song_04.mp3' },
  { title: 'Plutopia at Night', from: 'Plutopia', src: GH + 'plutopia/audio/plutopia_song_nighttime_01.mp3' },
  { title: 'Plutopia at Night II', from: 'Plutopia', src: GH + 'plutopia/audio/plutopia_song_nighttime_02.mp3' },
  { title: 'Shredworld I', from: 'Shredworld', src: GH + 'city/audio/songs/shredworld_song_01.mp3' },
  { title: 'Shredworld II', from: 'Shredworld', src: GH + 'city/audio/songs/shredworld_song_02.mp3' },
  { title: 'Yoga Pants', from: 'Portfolio', src: 'audio/Yoga_Pants.mp3' },
];

// Sound effects: audio/sfx/index.json lists them (built from the games' audio).
export const SFX = { index: 'audio/sfx/index.json', zip: 'audio/sfx/colin-willow-sfx.zip',
  license: 'Free to use in anything, commercial included. No credit needed (appreciated though).' };

// About. The web of things around his head; each goes somewhere real.
export const ABOUT = {
  lede: "I design and build games, rigged 3D characters, tools, motion and brands, and most of it ends up running in a browser on somebody's phone.",
  more: "I run a couple of studios: SeaWillow, a holding company and design studio, and Majia, a game studio. There's also Unknown, a clothing label. Away from the screen it's ceramics, laser cutting and 3D-printed figures.",
  web: [
    ['Games', 'play'], ['3D characters', 'assets'], ['Motion', 'motion'], ['Illustration', 'workbench'],
    ['Branding', 'workbench'], ['Web', 'web'], ['Tools', 'scripts'], ['Sound', 'audio'], ['Essays', 'writing'],
    ['Ceramics', 'workbench'], ['Laser cutting', 'workbench'], ['3D printing', 'workbench'], ['Studios', 'studios'],
  ],
};
