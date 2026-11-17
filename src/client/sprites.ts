import type Phaser from 'phaser';

/**
 * 32×32 pixel-art heroes drawn in code (no art files). Each hero faces right; the enemy is flipped.
 * Two frames: 0 = idle, 1 = idle breathing (upper body 1px lower). After drawing, an automatic
 * outline pass rings every opaque shape with a dark line, the classic pixel-art look.
 */

export const HERO_PX = 32;
const OUTLINE = '#1a1420';

type Ctx = CanvasRenderingContext2D;

/** Small drawing kit. `b` = breathing offset applied to upper-body parts. */
function kit(c: Ctx, b: number) {
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(x, y, w, h);
  };
  return {
    r,
    /** upper body rect (moves with breathing) */
    u: (x: number, y: number, w: number, h: number, col: string) => r(x, y + b, w, h, col),
    p: (x: number, y: number, col: string) => r(x, y, 1, 1, col),
    pu: (x: number, y: number, col: string) => r(x, y + b, 1, 1, col),
  };
}

function shadow(c: Ctx) {
  c.fillStyle = 'rgba(0,0,0,0.28)';
  c.fillRect(9, 30, 14, 2);
  c.fillRect(11, 29, 10, 1);
}

// ---------------- knight: plumed helm, blue tabard, sword and shield ----------------
function knight(c: Ctx, b: number) {
  const { r, u, pu } = kit(c, b);
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
function assassin(c: Ctx, b: number) {
  const { r, u, pu } = kit(c, b);
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
function berserker(c: Ctx, b: number) {
  const { r, u, pu } = kit(c, b);
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
function witch(c: Ctx, b: number) {
  const { r, u, pu } = kit(c, b);
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

const DRAW: Record<string, (c: Ctx, b: number) => void> = { knight, assassin, berserker, witch };

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

/** Draw one hero frame onto a 32×32 canvas context (pure: also used for previews / tests). */
export function drawHero(c: Ctx, hero: string, frame: 0 | 1) {
  c.clearRect(0, 0, HERO_PX, HERO_PX);
  c.imageSmoothingEnabled = false;
  (DRAW[hero] ?? knight)(c, frame);
  outline(c);
  shadow(c);
}

/** Textures 'hero_<id>' (idle) and 'hero_<id>_1' (breathing) + an 'idle_<id>' animation. */
export function makeTextures(scene: Phaser.Scene) {
  for (const hero of Object.keys(DRAW)) {
    ([0, 1] as const).forEach((frame) => {
      const key = frame ? `hero_${hero}_1` : `hero_${hero}`;
      if (scene.textures.exists(key)) return;
      const tex = scene.textures.createCanvas(key, HERO_PX, HERO_PX);
      if (!tex) return;
      drawHero(tex.getContext(), hero, frame);
      tex.refresh();
    });
    const anim = `idle_${hero}`;
    if (!scene.anims.exists(anim)) {
      scene.anims.create({
        key: anim,
        frames: [{ key: `hero_${hero}` }, { key: `hero_${hero}_1` }],
        frameRate: 2,
        repeat: -1,
      });
    }
  }
}
