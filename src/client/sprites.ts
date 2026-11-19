import type Phaser from 'phaser';

/**
 * 32×32 pixel-art heroes drawn in code (no art files). Each hero faces right; the enemy is flipped.
 * Poses: idle, breathe (upper body 1px lower), cast (lean forward + effect), hit (lean back),
 * dead (lying down, greyed). After drawing, an automatic outline pass rings every opaque shape
 * with a dark line, the classic pixel-art look.
 */

export const HERO_PX = 32;
const OUTLINE = '#1a1420';

type Ctx = CanvasRenderingContext2D;

export const POSES = ['idle', 'breathe', 'cast', 'hit', 'dead'] as const;
export type Pose = (typeof POSES)[number];

/** Upper-body offset per pose: [lean x, y]. Legs never move, so the hero leans from the hips. */
const POSE_OFF: Record<Pose, [number, number]> = { idle: [0, 0], breathe: [0, 1], cast: [2, -1], hit: [-2, 1], dead: [0, 0] };

/** Effect colour per hero for the cast pose. */
const ACCENT: Record<string, string> = {
  knight: '#e9b949', thornguard: '#8fd14f', assassin: '#d8504a', duelist: '#ff6f8a',
  berserker: '#f08a4b', pyro: '#ffb347', witch: '#8fe8ff', chrono: '#c49bff',
};

/** Small drawing kit. `b` = breathing offset and `lx` = lean, both applied to upper-body parts. */
function kit(c: Ctx, b: number, lx = 0) {
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  return {
    r,
    /** upper body rect (moves with breathing and leaning) */
    u: (x: number, y: number, w: number, h: number, col: string) => r(x + lx, y + b, w, h, col),
    p: (x: number, y: number, col: string) => r(x, y, 1, 1, col),
    pu: (x: number, y: number, col: string) => r(x + lx, y + b, 1, 1, col),
  };
}

function shadow(c: Ctx) {
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.fillRect(9, 30, 14, 2);
  c.fillRect(11, 29, 10, 1);
}

// ---------------- knight: plumed helm, blue tabard, sword and shield ----------------
function knight(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const S = { d: '#5d6573', m: '#9aa4b1', l: '#d5dde6' }; // steel
  const T = { d: '#22427e', m: '#3e6fc4', l: '#6c98e0' }; // tabard
  // legs + boots
  r(12, 23, 3, 5, S.m); r(17, 23, 3, 5, S.m); r(12, 23, 1, 5, S.l); r(19, 23, 1, 5, S.d);
  r(11, 28, 5, 2, '#3a2a22'); r(16, 28, 5, 2, '#3a2a22');
  // body: armor + tabard
  u(11, 13, 10, 10, S.m); u(11, 13, 1, 10, S.l); u(20, 13, 1, 10, S.d);
  u(13, 14, 6, 9, T.m); u(13, 14, 1, 9, T.l); u(18, 14, 1, 9, T.d);
  u(15, 16, 2, 4, '#e9b949'); u(14, 17, 4, 1, '#e9b949'); // gold cross
  u(11, 21, 10, 1, '#3a2a22'); pu(16, 21, '#e9b949'); // belt + buckle
  // pauldrons
  u(9, 13, 3, 3, S.m); u(9, 13, 3, 1, S.l); u(20, 13, 3, 3, S.m); u(20, 13, 3, 1, S.l);
  // helmet
  u(11, 3, 10, 10, S.m); u(11, 3, 10, 2, S.l); u(11, 3, 1, 10, S.l); u(20, 4, 1, 9, S.d);
  u(14, 7, 7, 1, '#141018'); u(14, 8, 7, 1, '#2a2430'); // visor slit
  u(16, 9, 1, 3, S.d); u(18, 9, 1, 3, S.d); // breathing holes
  u(15, 0, 3, 3, '#c8423c'); u(13, 1, 2, 3, '#a8322d'); u(17, 1, 1, 2, '#e86a5c'); // plume
  // shield (front, left side)
  u(5, 14, 7, 9, T.m); u(5, 14, 7, 1, S.l); u(5, 14, 1, 8, S.l); u(11, 15, 1, 8, S.d);
  u(6, 22, 5, 1, T.d); u(7, 23, 3, 1, T.d);
  u(8, 16, 1, 5, '#e9b949'); u(6, 18, 5, 1, '#e9b949');
  // sword (right hand, raised)
  u(22, 15, 3, 3, S.m); // gauntlet
  u(23, 2, 2, 12, S.l); u(24, 3, 1, 11, S.m); pu(23, 1, S.l);
  u(21, 14, 6, 1, '#e9b949'); u(23, 15, 2, 3, '#6b4a2a'); // guard + grip
}

// ---------------- assassin: hood, scarf mask, twin daggers ----------------
function assassin(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const H = { d: '#1d1f33', m: '#2c2f4a', l: '#454a6e' }; // hood / cloak
  const D = { m: '#b8c2cc', l: '#eef4fa' }; // daggers
  // legs: dark wraps
  r(12, 23, 3, 5, H.m); r(17, 23, 3, 5, H.m); r(12, 25, 3, 1, H.l); r(17, 25, 3, 1, H.l);
  r(11, 28, 4, 2, '#15131f'); r(17, 28, 4, 2, '#15131f');
  // cape tail behind
  u(8, 13, 4, 12, H.d); u(7, 22, 3, 4, H.d);
  // body
  u(11, 13, 10, 10, H.m); u(11, 13, 1, 10, H.l); u(20, 13, 1, 10, H.d);
  u(14, 13, 4, 10, '#3a3e5e'); // inner tunic
  u(11, 20, 10, 2, '#5a3a24'); u(13, 20, 2, 2, '#7a5232'); u(18, 20, 2, 2, '#7a5232'); // belt + pouches
  // hood
  u(10, 2, 12, 11, H.m); u(10, 2, 12, 1, H.l); u(10, 2, 1, 11, H.l); u(21, 3, 1, 10, H.d);
  u(12, 0, 7, 2, H.m); u(18, 1, 4, 2, H.m);
  u(13, 5, 8, 6, '#0d0c14'); // shadowed face
  u(15, 7, 2, 1, '#e8f6ff'); u(19, 7, 2, 1, '#e8f6ff'); // glinting eyes
  u(13, 9, 9, 3, '#b5322d'); u(13, 9, 9, 1, '#d8504a'); u(12, 11, 3, 3, '#8f2622'); // scarf mask + tail
  // daggers
  u(22, 16, 2, 2, H.l); u(24, 13, 1, 5, D.l); u(25, 14, 1, 4, D.m); u(23, 18, 3, 1, '#e9b949');
  u(8, 17, 2, 2, H.l); u(5, 18, 4, 1, D.l); u(5, 19, 3, 1, D.m); u(9, 17, 1, 3, '#e9b949');
  pu(24, 12, D.l);
}

// ---------------- berserker: wild hair, beard, war paint, fur, big axe ----------------
function berserker(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const K = { d: '#a8693f', m: '#d79a6b', l: '#eebb8c' }; // skin
  const Hr = { d: '#a8431a', m: '#d9622b', l: '#f08a4b' }; // hair
  const F = { d: '#5a4632', m: '#8a7055', l: '#b49a7a' }; // fur
  // legs + kilt
  r(12, 24, 3, 4, K.m); r(17, 24, 3, 4, K.m); r(12, 24, 1, 4, K.l);
  r(11, 28, 5, 2, '#4a3020'); r(16, 28, 5, 2, '#4a3020');
  u(11, 20, 10, 4, '#6b4628'); u(11, 20, 10, 1, '#8a5c36'); u(13, 22, 1, 2, '#4a3020'); u(17, 22, 1, 2, '#4a3020');
  // torso (bare, muscles)
  u(11, 12, 10, 8, K.m); u(11, 12, 2, 8, K.l); u(19, 12, 2, 8, K.d);
  u(15, 14, 1, 5, K.d); u(13, 16, 2, 1, K.d); u(17, 16, 2, 1, K.d); // abs
  u(12, 13, 1, 3, '#3b6fd1'); u(14, 13, 1, 3, '#3b6fd1'); // war paint
  u(10, 19, 12, 1, '#3a2a1a'); pu(16, 19, '#c0c8d0'); // belt
  // fur pauldron (left)
  u(8, 11, 6, 4, F.m); u(8, 11, 6, 1, F.l); u(9, 14, 1, 1, F.d); u(11, 14, 1, 1, F.d); u(13, 14, 1, 1, F.d);
  // head
  u(12, 4, 8, 8, K.m); u(12, 4, 1, 8, K.l); u(19, 5, 1, 7, K.d);
  u(16, 7, 1, 1, '#141018'); u(18, 7, 1, 1, '#141018'); u(15, 6, 4, 1, Hr.d); // eyes + angry brows
  u(15, 8, 4, 1, '#3b6fd1'); // face paint stripe under the eyes
  // wild hair + beard
  u(10, 1, 11, 4, Hr.m); u(10, 1, 11, 1, Hr.l); u(9, 2, 2, 6, Hr.m); u(11, 0, 2, 1, Hr.l); u(15, 0, 2, 1, Hr.l); u(19, 0, 2, 1, Hr.m);
  u(13, 10, 7, 4, Hr.m); u(14, 13, 5, 2, Hr.d); u(15, 10, 3, 1, '#7a2a1a'); // beard + mouth
  // big axe (right hand)
  u(21, 13, 3, 3, K.m); // fist
  u(22, 1, 2, 22, '#7a4a26'); u(22, 1, 1, 22, '#9a6236'); // handle
  u(24, 2, 4, 8, '#c0c8d0'); u(27, 1, 2, 10, '#e8eef4'); u(24, 2, 4, 1, '#e8eef4'); u(24, 9, 4, 1, '#8a929c'); // blade
  u(19, 3, 3, 5, '#8a929c'); u(19, 3, 3, 1, '#c0c8d0'); // back spike
}

// ---------------- witch: pointed hat, ice robe, crystal staff ----------------
function witch(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const Hat = { d: '#203a80', m: '#2f4fa8', l: '#4f74d0' };
  const R = { d: '#4a8fc0', m: '#7cc6ee', l: '#c6efff' }; // robe
  const K = { m: '#f3dccb', d: '#d8b8a0' }; // pale skin
  // robe skirt to the ground (no visible legs)
  r(10, 22, 12, 6, R.m); r(10, 22, 2, 6, R.l); r(20, 22, 2, 6, R.d); r(9, 27, 14, 2, R.d);
  r(12, 29, 3, 1, '#2a2440'); r(17, 29, 3, 1, '#2a2440');
  // body
  u(11, 13, 10, 9, R.m); u(11, 13, 2, 9, R.l); u(19, 13, 2, 9, R.d);
  u(15, 13, 2, 9, '#e8f8ff'); u(11, 18, 10, 1, '#e9b949'); // trim + gold sash
  // white hair
  u(10, 8, 12, 6, '#e8eef7'); u(10, 8, 1, 7, '#ffffff'); u(21, 9, 1, 6, '#b8c4d4');
  // face
  u(13, 8, 7, 5, K.m); u(19, 9, 1, 4, K.d);
  u(16, 10, 1, 1, '#1a3a7a'); u(18, 10, 1, 1, '#1a3a7a'); u(17, 12, 2, 1, '#d88a9a');
  // hat: wide brim + tall bent cone + star
  u(8, 7, 16, 2, Hat.m); u(8, 7, 16, 1, Hat.l);
  u(11, 3, 10, 4, Hat.m); u(11, 3, 1, 4, Hat.l); u(13, 1, 6, 2, Hat.m); u(16, 0, 4, 1, Hat.m); u(19, 0, 2, 2, Hat.d);
  u(14, 4, 2, 2, '#ffe066'); pu(15, 3, '#fff6b0');
  u(11, 6, 10, 1, '#7cc6ee'); // hat band
  // staff with ice crystal (right hand)
  u(21, 15, 3, 3, K.m);
  u(23, 7, 1, 21, '#6b4a2a'); u(24, 8, 1, 20, '#4a3020');
  u(22, 2, 4, 5, '#8fe8ff'); u(23, 1, 2, 7, '#bff3ff'); pu(23, 2, '#ffffff'); u(21, 4, 1, 2, '#5ad0f0'); u(26, 4, 1, 2, '#5ad0f0');
  // frost sparkles
  pu(7, 12, '#bff3ff'); pu(27, 10, '#bff3ff'); pu(6, 20, '#8fe8ff');
}

// ---------------- thornguard: bark armor, bone spikes, spiked round shield, mace ----------------
function thornguard(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const B = { d: '#3f2c1c', m: '#6b4a2e', l: '#8e6a45' }; // bark
  const G = { d: '#2e5a1e', m: '#4f8a2e', l: '#8fd14f' }; // moss
  const SP = '#ece3c8'; // bone spikes
  // legs + boots
  r(12, 23, 3, 5, B.m); r(17, 23, 3, 5, B.m); r(12, 23, 1, 5, B.l);
  r(11, 28, 5, 2, B.d); r(16, 28, 5, 2, B.d);
  // bulky body
  u(10, 12, 12, 11, B.m); u(10, 12, 2, 11, B.l); u(20, 12, 2, 11, B.d);
  u(13, 14, 6, 7, G.m); u(13, 14, 6, 1, G.l); u(15, 16, 2, 3, G.d); // moss chest plate
  u(10, 21, 12, 1, B.d);
  // shoulder spikes
  u(8, 11, 4, 3, B.m); u(20, 11, 4, 3, B.m); pu(8, 10, SP); pu(10, 9, SP); pu(23, 10, SP); pu(21, 9, SP);
  // helmet with horns
  u(12, 3, 9, 9, B.m); u(12, 3, 9, 1, B.l); u(12, 3, 1, 9, B.l); u(20, 4, 1, 8, B.d);
  u(14, 7, 6, 2, '#141018'); pu(16, 7, '#b8ff6a'); pu(18, 7, '#b8ff6a'); // green glowing eyes
  u(11, 1, 2, 3, SP); u(10, 0, 1, 2, SP); u(20, 1, 2, 3, SP); u(22, 0, 1, 2, SP); // horns
  // spiked round shield (front)
  u(4, 13, 8, 9, G.d); u(5, 14, 6, 7, G.m); u(5, 14, 6, 1, G.l); u(7, 16, 2, 3, B.l);
  pu(3, 15, SP); pu(3, 19, SP); pu(7, 12, SP); pu(7, 22, SP); pu(4, 13, SP); pu(4, 21, SP);
  // mace (right hand)
  u(22, 15, 3, 3, B.l);
  u(23, 7, 2, 9, B.d);
  u(21, 3, 6, 5, '#8a929c'); u(21, 3, 6, 1, '#c0c8d0'); pu(20, 5, SP); pu(27, 5, SP); pu(23, 2, SP); pu(25, 2, SP);
}

// ---------------- duelist: feathered hat, crimson coat, two rapiers ----------------
function duelist(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const C = { d: '#7a1428', m: '#b52a45', l: '#e05a72' }; // coat
  const K = { m: '#eec4a0', d: '#c99c78' }; // skin
  const S = { m: '#c0c8d0', l: '#f4f8fc' }; // blades
  // slim legs, tall boots
  r(13, 22, 2, 6, '#e8e0d0'); r(17, 22, 2, 6, '#e8e0d0');
  r(12, 26, 4, 4, '#2a1a14'); r(16, 26, 4, 4, '#2a1a14');
  // coat with tails
  u(12, 13, 8, 9, C.m); u(12, 13, 1, 9, C.l); u(19, 13, 1, 9, C.d);
  u(11, 20, 3, 4, C.d); u(18, 20, 3, 4, C.d);
  u(15, 13, 2, 7, '#f4ece0'); pu(15, 15, '#e9b949'); pu(15, 17, '#e9b949'); // shirt + buttons
  u(12, 19, 8, 1, '#2a1a14'); // belt
  // head
  u(13, 6, 7, 7, K.m); u(19, 7, 1, 6, K.d);
  u(16, 8, 1, 1, '#141018'); u(18, 8, 1, 1, '#141018');
  u(16, 11, 4, 1, '#5a3220'); // moustache
  u(12, 6, 2, 5, '#5a3220'); // hair
  // wide hat + feather
  u(10, 4, 13, 2, '#2a1a2e'); u(12, 1, 9, 3, '#3a2a40'); u(12, 3, 9, 1, '#e9b949');
  u(9, 0, 4, 2, '#ffffff'); u(8, 1, 2, 2, '#ffd0dc'); pu(7, 2, '#ffd0dc');
  // rapier forward (right hand) + rapier raised (left hand)
  u(20, 15, 3, 2, K.m); u(22, 14, 1, 4, '#e9b949');
  u(23, 15, 8, 1, S.l); u(23, 16, 7, 1, S.m);
  u(9, 15, 3, 2, K.m); u(10, 14, 3, 1, '#e9b949');
  u(10, 4, 1, 10, S.l); u(11, 5, 1, 9, S.m);
}

// ---------------- pyro: ember robe, hood, flame in hand ----------------
function pyro(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const R = { d: '#7a2410', m: '#b8441c', l: '#e0703a' }; // robe
  const F = { d: '#ff6a1a', m: '#ffb347', l: '#fff2a0' }; // fire
  // robe skirt with a smouldering hem
  r(10, 22, 12, 6, R.m); r(10, 22, 2, 6, R.l); r(20, 22, 2, 6, R.d); r(9, 27, 14, 2, R.d);
  r(10, 28, 2, 1, F.d); r(14, 28, 2, 1, F.d); r(19, 28, 2, 1, F.d);
  r(12, 29, 3, 1, '#2a1a14'); r(17, 29, 3, 1, '#2a1a14');
  // body
  u(11, 13, 10, 9, R.m); u(11, 13, 2, 9, R.l); u(19, 13, 2, 9, R.d);
  u(11, 18, 10, 1, '#3a2014'); pu(16, 18, F.m);
  // hood
  u(11, 3, 10, 11, R.d); u(11, 3, 10, 1, R.m); u(11, 3, 1, 10, R.m); u(13, 1, 6, 2, R.d); u(16, 0, 3, 1, R.d);
  u(13, 6, 7, 6, '#1a0e0a'); // shadowed face
  u(15, 8, 2, 1, F.m); u(18, 8, 2, 1, F.m); // glowing eyes
  // flame in the right hand
  u(21, 15, 3, 3, '#e8c0a0');
  u(22, 8, 4, 7, F.d); u(23, 7, 3, 7, F.m); u(23, 10, 2, 4, F.l); pu(24, 5, F.m); pu(22, 6, F.d); pu(26, 9, F.d);
  // embers
  pu(8, 10, F.m); pu(27, 4, F.l); pu(6, 18, F.d); pu(28, 14, F.m);
}

// ---------------- chrono: violet robe, long beard, hourglass staff, clock halo ----------------
function chrono(c: Ctx, b: number, lx: number) {
  const { r, u, pu } = kit(c, b, lx);
  const V = { d: '#3a2470', m: '#5a3ea8', l: '#8a6ad8' }; // robe
  const T = { m: '#3fc8c0', l: '#a0fff4' }; // teal trim
  const Gd = '#e9b949';
  // robe skirt
  r(10, 22, 12, 6, V.m); r(10, 22, 2, 6, V.l); r(20, 22, 2, 6, V.d); r(9, 27, 14, 2, V.d);
  r(9, 27, 14, 1, T.m);
  r(12, 29, 3, 1, '#1a1428'); r(17, 29, 3, 1, '#1a1428');
  // body
  u(11, 13, 10, 9, V.m); u(11, 13, 2, 9, V.l); u(19, 13, 2, 9, V.d);
  u(15, 13, 2, 9, T.m); u(11, 18, 10, 1, Gd);
  // face + long grey beard
  u(13, 7, 7, 6, '#e8d0b8'); u(19, 8, 1, 5, '#c8a890');
  u(15, 9, 1, 1, '#1a3a7a'); u(18, 9, 1, 1, '#1a3a7a');
  u(14, 11, 6, 4, '#d8dce4'); u(15, 15, 4, 2, '#c0c4cc'); u(16, 17, 2, 1, '#a8acb4');
  // hood
  u(11, 3, 10, 5, V.d); u(11, 3, 10, 1, V.m); u(12, 1, 8, 2, V.d); u(11, 3, 2, 10, V.d);
  pu(14, 4, T.l); pu(18, 5, T.l);
  // clock halo behind the head
  pu(10, 2, Gd); pu(16, 0, Gd); pu(22, 2, Gd); pu(9, 7, Gd); pu(23, 7, Gd);
  // hourglass staff (right hand)
  u(21, 15, 3, 3, '#e8d0b8');
  u(23, 9, 1, 19, '#6b4a2a');
  u(21, 2, 5, 1, Gd); u(21, 8, 5, 1, Gd); u(22, 3, 3, 2, T.l); pu(23, 5, T.m); u(22, 6, 3, 2, T.m); pu(23, 7, T.l);
}

const DRAW: Record<string, (c: Ctx, b: number, lx: number) => void> = {
  knight, thornguard, assassin, duelist, berserker, pyro, witch, chrono,
};

/** Dark 1px ring around every opaque pixel (skips the ground shadow). */
function outline(c: Ctx) {
  const N = HERO_PX;
  const img = c.getImageData(0, 0, N, N);
  const a = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? 0 : img.data[(y * N + x) * 4 + 3]);
  const solid = (x: number, y: number) => a(x, y) > 200;
  const out: [number, number][] = [];
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++)
      if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) out.push([x, y]);
  c.fillStyle = OUTLINE;
  for (const [x, y] of out) c.fillRect(x, y, 1, 1);
}

/** Cast effect: a small burst in the hero's colour in front of the weapon hand. */
function castFx(c: Ctx, hero: string) {
  c.fillStyle = ACCENT[hero] ?? '#ffffff';
  for (const [x, y] of [[28, 12], [29, 14], [30, 11], [27, 9], [29, 17], [31, 14]]) c.fillRect(x, y, 1, 1);
  c.fillStyle = '#ffffff';
  c.fillRect(29, 13, 1, 1);
}

/** Hit effect: impact sparks at the chest. */
function hitFx(c: Ctx) {
  c.fillStyle = '#ffffff';
  for (const [x, y] of [[23, 12], [25, 15], [22, 17]]) c.fillRect(x, y, 1, 1);
  c.fillStyle = '#ff5555';
  for (const [x, y] of [[24, 13], [24, 16]]) c.fillRect(x, y, 1, 1);
}

/** Grey out, keeping `keep` of the colour (dead pose). */
function desaturate(c: Ctx, keep = 0.3) {
  const img = c.getImageData(0, 0, HERO_PX, HERO_PX);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
    d[i] = g + (d[i] - g) * keep;
    d[i + 1] = g + (d[i + 1] - g) * keep;
    d[i + 2] = g + (d[i + 2] - g) * keep;
  }
  c.putImageData(img, 0, 0);
}

/** Draw one hero pose onto a 32×32 canvas context (pure: also used for previews). Frame 0/1 = idle/breathe. */
export function drawHero(c: Ctx, hero: string, frame: 0 | 1 | Pose) {
  const pose: Pose = frame === 0 ? 'idle' : frame === 1 ? 'breathe' : frame;
  const draw = DRAW[hero] ?? knight;
  c.clearRect(0, 0, HERO_PX, HERO_PX);
  c.imageSmoothingEnabled = false;
  if (pose === 'dead') {
    // draw standing on a scratch canvas, then lay it on the ground (head towards the enemy)
    const tmp = document.createElement('canvas');
    tmp.width = tmp.height = HERO_PX;
    const t = tmp.getContext('2d')!;
    draw(t, 0, 0);
    outline(t);
    desaturate(t);
    c.save();
    c.translate(HERO_PX, HERO_PX + 2);
    c.rotate(Math.PI / 2);
    c.drawImage(tmp, -HERO_PX, 0);
    c.restore();
    c.fillStyle = 'rgba(0,0,0,0.28)';
    c.fillRect(2, 30, 28, 2);
    return;
  }
  const [lx, b] = POSE_OFF[pose];
  draw(c, b, lx);
  outline(c);
  if (pose === 'cast') castFx(c, hero);
  if (pose === 'hit') hitFx(c);
  shadow(c);
}

/** Texture key of one pose ('hero_<id>' is the idle pose). */
export const poseKey = (hero: string, pose: Pose) => (pose === 'idle' ? `hero_${hero}` : `hero_${hero}_${pose}`);

/**
 * A texture per pose + animations: 'idle_<id>' (loops), 'cast_<id>' and 'hit_<id>' (short; the scene chains
 * back to idle) and 'dead_<id>' (holds the last frame).
 */
export function makeTextures(scene: Phaser.Scene) {
  for (const hero of Object.keys(DRAW)) {
    for (const pose of POSES) {
      const key = poseKey(hero, pose);
      if (scene.textures.exists(key)) continue;
      const tex = scene.textures.createCanvas(key, HERO_PX, HERO_PX);
      if (!tex) continue;
      drawHero(tex.getContext(), hero, pose);
      tex.refresh();
      tex.setFilter(1 as Phaser.Textures.FilterMode); // NEAREST: keeps the 32px heroes crisp until mochi sprites replace them
    }
    const anims: [string, Pose[], number, number][] = [
      [`idle_${hero}`, ['idle', 'breathe'], 2, -1],
      [`cast_${hero}`, ['cast', 'cast'], 8, 0],
      [`hit_${hero}`, ['hit', 'hit'], 10, 0],
      [`dead_${hero}`, ['hit', 'dead'], 5, 0],
    ];
    for (const [key, poses, frameRate, repeat] of anims) {
      if (!scene.anims.exists(key)) scene.anims.create({ key, frames: poses.map((p) => ({ key: poseKey(hero, p) })), frameRate, repeat });
    }
  }
}
