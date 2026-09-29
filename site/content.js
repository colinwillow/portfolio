// Everything the site says lives here. The pages render from it, and (later)
// mini-Colin reads it too, so the two can never disagree about what is on the site.
//
// To add something: add an entry to the right list. `slug` becomes its URL
// (colinwillow.com/<section>/<slug>), so do not rename a slug once it has been
// linked from a video description.

// Your Gumroad profile, e.g. 'https://colinwillow.gumroad.com'. Empty = the
// buy/download buttons stay hidden rather than pointing nowhere.
export const GUMROAD = '';

export const GH = 'https://colinwillow.github.io/';

export const SITE = {
  name: 'Colin Willow',
  tagline: 'Games, characters, tools and strange little worlds.',
  github: 'https://github.com/colinwillow',
};

// The globe's labels. `lat`/`lon` are where each sits on the sphere (degrees),
// `tier` sets how big it is: 1 = the main three, 2 = supporting, 3 = the rest.
export const SECTIONS = [
  { key: 'play',      label: 'Play',      tier: 1, lat:  18, lon:  -20, blurb: 'Games and web apps you can open right now.' },
  { key: 'assets',    label: 'Assets',    tier: 1, lat: -22, lon:   40, blurb: 'Rigged, animated characters built for web and mobile games.' },
  { key: 'scripts',   label: 'Scripts',   tier: 1, lat:  38, lon:  100, blurb: 'Cinema 4D and pipeline scripts from the tutorials.' },
  { key: 'web',       label: 'Web',       tier: 2, lat: -40, lon:  150, blurb: 'Sites built for brands and friends.' },
  { key: 'motion',    label: 'Motion',    tier: 2, lat:   8, lon: -120, blurb: 'CGI loops, logo reveals, character tests.' },
  { key: 'studios',   label: 'Studios',   tier: 2, lat:  52, lon:  -70, blurb: 'SeaWillow, Majia and Unknown.' },
  { key: 'writing',   label: 'Writing',   tier: 2, lat:  30, lon:  165, blurb: 'Essays about art and making, read aloud.' },
  { key: 'workbench', label: 'Workbench', tier: 3, lat: -55, lon:  -30, blurb: 'Illustration, logos, and everything made by hand.' },
  { key: 'about',     label: 'About',     tier: 3, lat:  -8, lon: -170, blurb: 'Who made this.' },
];

// status: 'live' | 'dev' (playable but in development) | 'soon'
export const PLAY = [
  { slug: 'shredworld', title: 'Shredworld', kind: 'Game', status: 'dev', thumb: 'shredworld',
    url: GH + 'city/', tags: ['three.js', 'mobile', 'open world'],
    blurb: 'Skate an open low-poly city. Board tricks, grinds, ladders, a jetpack, a blaster, the police, and a ship you can fly off a rooftop.' },
  { slug: 'plutopia', title: 'Plutopia', kind: 'Game', status: 'dev', thumb: 'plutopia',
    url: GH + 'plutopia/', tags: ['three.js', 'mobile'],
    blurb: 'A tiny painted planet with a toon alien, a flyable ship with articulated jets and landing gear, and a claw.' },
  { slug: 'robits', title: 'Robits Neon Blast', kind: 'Game', status: 'dev', thumb: 'robits',
    url: GH + 'robits/', tags: ['three.js', 'twin-stick'],
    blurb: 'Neon robot arena shooter with wall-crawling and crazy gravity. The first Majia title.' },
  { slug: 'melee', title: 'Melee', kind: 'Game', status: 'dev', thumb: 'melee',
    url: GH + 'melee/', tags: ['three.js', 'twin-stick'],
    blurb: 'Twin-stick action in a toon city: blaster, hammer, a DNA gun that turns you into whoever you shoot, and breakable buildings.' },
  { slug: 'big-don', title: 'Big Don', kind: 'Game', status: 'dev', thumb: 'bigdon',
    url: GH + 'BigDon/', tags: ['three.js', 'twin-stick'],
    blurb: 'Toon-shaded action with ledge hangs, cover, long jumps and mirrored strike combos. Two thumbs, no buttons.' },
  { slug: 'peggy', title: 'Peggy', kind: 'Game', status: 'dev', thumb: 'peggy',
    url: GH + 'peggy/', tags: ['three.js', 'adventure'],
    blurb: 'A cyclops-octopus pirate with a hook for a hand and a peg for a leg — and a game built around both.' },
  { slug: 'rollergirl', title: 'Rollergirl', kind: 'Game', status: 'dev',
    url: GH + 'rollergirl/', tags: ['three.js', 'skate park'],
    blurb: 'Rollerblading in a procedural park: half pipes, a bowl, kickers and real transition physics.' },
  { slug: 'portland', title: 'Portland', kind: 'Game', status: 'dev',
    url: GH + 'portland/', tags: ['three.js', 'open data'],
    blurb: 'A walkable Portland built from open map data — streets, bridges, crowds, traffic and boats on the Willamette.' },
  { slug: 'sky', title: 'Sky', kind: 'Game', status: 'dev',
    url: GH + 'sky/', tags: ['three.js', 'planets'],
    blurb: 'Procedural planets you can walk on and fly between, with a scattered-light sky.' },
  { slug: 'colin', title: 'Talk to Colin', kind: 'App', status: 'dev',
    url: GH + 'colin/', tags: ['voice', 'AI'],
    blurb: 'A rigged mini-me in a baked kitchen. Push to talk and he answers in my voice, lip-synced.' },
  { slug: 'glorb', title: 'Glorb', kind: 'App', status: 'live', thumb: 'glorb',
    url: GH + 'glorp/', tags: ['audio', 'voice'],
    blurb: 'An audio-reactive particle orb you can talk to.' },
  { slug: 'eye', title: 'Eye', kind: 'App', status: 'live', thumb: 'eye',
    url: GH + 'eye/', tags: ['camera', 'experiment'],
    blurb: 'Eye tracking off a phone\'s front camera. Calibrate, then paint with your eyes.' },
];

// Characters. Every number was read off the GLB itself (the viewer re-measures
// it live in the browser). `glb` is the preview file in models/assets/; `price`
// stays '' until decided; `gumroad` is the product link once it exists.
export const ASSETS = [
  { slug: 'zap', title: 'Zap', from: 'Melee', glb: 'models/assets/zap.glb', mb: 4.1,
    tris: 11059, joints: 62, clips: 61, prefer: ['idle_01'],
    notes: ['61 clips: parkour, ledges, melee, rifle, skateboard', 'Weapon mounts on both hands', 'Draco + WebP, one material'] },
  { slug: 'alien-warrior', title: 'Alien Warrior', from: 'Melee', glb: 'models/assets/alien_warrior.glb', mb: 4.0,
    tris: 11071, joints: 59, clips: 52, prefer: ['standing_idle'],
    notes: ['Full melee combat set, blocks and hit reactions', 'Weapon mount for the mace', 'Draco + WebP'] },
  { slug: 'purple-alien', title: 'Purple Alien', from: 'Melee', glb: 'models/assets/alien_female_purple.glb', mb: 1.4,
    tris: 10966, joints: 193, clips: 3, prefer: ['idle_01'],
    notes: ['Hair and tail chains, ready for secondary motion', 'Single 2K texture'] },
  { slug: 'hick', title: 'Skinny Hick', from: 'Melee', glb: 'models/assets/hick_skinny.glb', mb: 2.1,
    tris: 10785, joints: 66, clips: 23, prefer: ['drunk_idle'],
    notes: ['Sober and drunk locomotion sets', 'Cigarette-tip joint for smoke'] },
  { slug: 'hobo', title: 'Hobo', from: 'Melee', glb: 'models/assets/hobo_01.glb', mb: 2.5,
    tris: 10318, joints: 65, clips: 29, prefer: ['drunk_idle'],
    notes: ['Hit reactions, knock-down and get-up', 'In-air pose for launches'] },
  { slug: 'clancy', title: 'Clancy', from: 'Melee', glb: 'models/assets/clancy.glb', mb: 1.5,
    tris: 11035, joints: 27, clips: 36, prefer: ['clancy_idle_01'],
    notes: ['Mutant attack set', 'Fall, roll and hard-landing clips'] },
  { slug: 'construction-worker', title: 'Construction Worker', from: 'Melee', glb: 'models/assets/contruction_worker.glb', mb: 1.7,
    tris: 10894, joints: 68, clips: 16, prefer: ['idle'],
    notes: ['Tool swings, vehicle enter/exit, knock-downs', 'Weapon mount for tools'] },
  { slug: 'roller-alien', title: 'Roller Alien', from: 'Melee', glb: 'models/assets/alien_rollerskate_blue.glb', mb: 1.2,
    tris: 10000, joints: 65, clips: 12, prefer: ['idle'],
    notes: ['Walk, run, strafe and turn set'] },
  { slug: 'rollergirl', title: 'Rollergirl', from: 'Rollergirl', glb: 'models/assets/roller_girl.glb', mb: 1.4,
    tris: 9857, joints: 66, clips: 5, prefer: ['coasting', 'idle'],
    notes: ['Skating and jump clips', 'Draco + WebP'] },
  { slug: 'big-don', title: 'Big Don', from: 'Big Don', glb: 'models/assets/big_donny.glb', mb: 10.3,
    tris: 20573, joints: 58, clips: 54, prefer: ['idle_1'],
    notes: ['Ledge, cover, crouch and strike sets', 'Mirrored left/right strikes'] },
].map(a => ({ gumroad: '', price: '', ...a }));

// Essays. `reading` is optional -- without one the page is just the text.
// See writing/README.md for how a reading is made.
export const WRITING = [
  { slug: 'art-has-two-lives', title: 'Art Has Two Lives', text: 'writing/art-has-two-lives.md',
    reading: 'writing/art-has-two-lives.json', voice: 'Read by Colin', note: 'A short opening; the full essay is on its way.' },
];

// Scripts. Slugs exist before the files do so tutorial links can go out early.
export const SCRIPTS = [
  { slug: 'arp-to-mixamo', title: 'Auto-Rig Pro → Mixamo', app: 'Cinema 4D', status: 'soon',
    blurb: 'Converts an Auto-Rig Pro rig to Mixamo naming so Mixamo clips and web retargeting just work.', file: '', video: '' },
  { slug: 'fbx-to-takes', title: 'FBX files → Takes', app: 'Cinema 4D', status: 'soon',
    blurb: 'Imports a folder of FBX animations into one document, one clip per take, ready to export.', file: '', video: '' },
];

export const WEB = [
  { slug: 'thatswassupps', title: 'Thatswassupps', url: 'https://thatswassupps.com', role: 'Site and brand work',
    blurb: 'A friend\'s company I ended up helping build.' },
  { slug: 'unknown', title: 'Unknown — SS25', url: GH + 'unknown/', role: 'Storefront',
    blurb: 'Product drops for my clothing label.' },
  { slug: 'faith', title: 'Faith Udall', url: 'https://faithudall.com', role: 'Personal site',
    blurb: 'A personal site for Faith.' },
];

export const STUDIOS = [
  { slug: 'seawillow', title: 'SeaWillow', url: GH + 'seawillow/', blurb: 'Holding company and design studio.' },
  { slug: 'majia', title: 'Majia', url: GH + 'majia/', thumb: 'majia', blurb: 'Game studio. Makers of Robits.' },
  { slug: 'unknown', title: 'Unknown', url: GH + 'unknown/', blurb: 'Clothing label.' },
];

const MOTION_FILES = [
  '1_motion_man_chair', '2_motion_alien_dj', '3_motion_brain_vat', '4_motion_nike_shoe', '5_motion_pepsi_snow',
  '6_motion_nike_logo', '7_motion_crush_goo', '8_motion_cwd_logo', '9_motion_color_orb', '10_motion_swirl_soda',
  '11_motion_looping_balls', '12_motion_donut_spin', '13_motion_alien_waving', '14_motion_cow', '15_motion_alien_drinking',
  '16_motion_delorean_rs', '17_motion_robot_world', '18_motion_sylk', '19_motion_splash_ball', '20_motion_monster_forest',
  '20_motion_xbox',
];
const pretty = f => f.replace(/^\d+_(motion|illl?ustration)_/, '').replace(/_/g, ' ');
export const MOTION = MOTION_FILES.map(f => ({ src: 'motion/' + f + '.mp4', title: pretty(f) }));

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
