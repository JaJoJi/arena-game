import type Phaser from 'phaser';

// All town art is drawn in code as chunky pixels — no image files needed for the POC.
// Buildings are drawn at 1 "art pixel" = 1 texture pixel, then shown at scale 3 with nearest filtering.

export const C = {
  stone: 0x9a9fae, stoneLight: 0xbfc3cf, stoneDark: 0x5f6475, rock: 0x7d7468, rockDark: 0x544c44,
  wood: 0x8a5a32, woodDark: 0x553620, logEnd: 0xd8b07a, plaster: 0xeadfc4,
  roofRed: 0xb5463c, roofRedDark: 0x7e2c27, roofBlue: 0x3e5fae, roofBlueLight: 0x6a8ad8, roofGreen: 0x3f7f4a,
  lamp: 0xffd56b, gold: 0xe9b949, crystal: 0x8ff3ff, glow: 0x9fd0ff, steel: 0xaab4c0,
  banner: 0x7b3fa0, red: 0xc0392b, white: 0xf3efe6, blue: 0x3e7fd0, green: 0x5aa04a, purple: 0x9a55c8,
  water: 0x4aa3df, waterLight: 0xa8e2ff, dark: 0x1d1612, paper: 0xf2ead2,
};

type Rect = (x: number, y: number, w: number, h: number, c: number) => void;
interface Art {
  r: Rect;
  /** stepped pixel triangle: apex at (xc, y), base width 2*half at y+h */
  tri(xc: number, y: number, half: number, h: number, c: number): void;
}

function makeArt(scene: Phaser.Scene, key: string, w: number, h: number, draw: (a: Art) => void) {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const r: Rect = (x, y, ww, hh, c) => {
    g.fillStyle(c, 1);
    g.fillRect(x, y, ww, hh);
  };
  const tri = (xc: number, y: number, half: number, hh: number, c: number) => {
    for (let i = 0; i < hh; i++) {
      const hw = Math.max(1, Math.round((half * (i + 1)) / hh));
      r(xc - hw, y + i, hw * 2, 1, c);
    }
  };
  draw({ r, tri });
  g.generateTexture(key, w, h);
  g.destroy();
}

export function makeTownArt(scene: Phaser.Scene) {
  // ---- เหมือง: rocky hill with a timbered mine entrance and an ore cart ----
  makeArt(scene, 'bld_mine', 56, 42, ({ r, tri }) => {
    tri(28, 4, 28, 38, C.rockDark);
    tri(28, 10, 21, 32, C.rock);
    r(12, 30, 2, 2, C.gold); r(40, 24, 2, 2, C.gold); r(34, 34, 2, 2, C.crystal); r(17, 20, 2, 2, C.crystal);
    r(19, 22, 3, 20, C.wood); r(33, 22, 3, 20, C.wood); r(17, 20, 21, 3, C.woodDark);
    r(22, 24, 11, 18, C.dark);
    r(36, 24, 2, 3, C.lamp);
    r(0, 40, 56, 1, C.steel); r(0, 41, 56, 1, C.woodDark);
    r(3, 32, 12, 6, C.woodDark); r(4, 33, 10, 4, C.wood);
    r(4, 30, 10, 2, C.gold); r(6, 29, 4, 1, C.crystal);
    r(4, 38, 3, 2, C.dark); r(11, 38, 3, 2, C.dark);
  });

  // ---- ลานตัดไม้: sawmill shed with a log pile ----
  makeArt(scene, 'bld_lumber', 62, 40, ({ r, tri }) => {
    r(4, 16, 32, 24, C.wood); r(4, 16, 32, 2, C.woodDark);
    for (let x = 8; x < 36; x += 6) r(x, 18, 1, 22, C.woodDark);
    tri(20, 4, 19, 12, C.roofGreen); r(1, 15, 38, 2, 0x2d5c36);
    r(14, 26, 10, 14, C.dark);
    r(26, 27, 7, 7, C.steel); r(28, 29, 3, 3, C.woodDark);
    r(38, 34, 22, 6, C.wood); r(38, 34, 3, 6, C.logEnd); r(38, 36, 22, 1, C.woodDark);
    r(41, 28, 16, 6, C.wood); r(41, 28, 3, 6, C.logEnd); r(41, 30, 16, 1, C.woodDark);
    r(44, 22, 10, 6, C.wood); r(44, 22, 3, 6, C.logEnd);
    r(58, 30, 3, 10, C.woodDark); r(57, 28, 5, 3, C.steel); // axe in a stump
  });

  // ---- หอเวท: tall stone tower, blue cone roof, crystal on top ----
  makeArt(scene, 'bld_tower', 34, 72, ({ r, tri }) => {
    r(9, 24, 16, 48, C.stone); r(9, 24, 2, 48, C.stoneDark); r(23, 24, 2, 48, C.stoneLight);
    for (let y = 28; y < 72; y += 6) r(9, y, 16, 1, C.stoneDark);
    r(15, 32, 4, 6, C.glow); r(15, 46, 4, 6, C.glow); r(16, 33, 2, 1, C.white);
    r(14, 60, 6, 12, C.woodDark); r(15, 59, 4, 1, C.woodDark);
    r(6, 22, 22, 3, C.stoneDark);
    tri(17, 3, 13, 20, C.roofBlue); tri(17, 3, 5, 20, C.roofBlueLight);
    r(16, 0, 2, 4, C.crystal); r(15, 1, 4, 2, C.crystal);
    r(4, 10, 1, 1, C.crystal); r(29, 16, 1, 1, C.crystal); r(2, 30, 1, 1, C.crystal); r(31, 40, 1, 1, C.crystal);
  });

  // ---- หอฮีโร่: timber-frame guild hall with red roof ----
  makeArt(scene, 'bld_hall', 68, 52, ({ r, tri }) => {
    r(4, 38, 60, 14, C.stone); for (let x = 4; x < 64; x += 8) r(x, 38, 1, 14, C.stoneDark); r(4, 44, 60, 1, C.stoneDark);
    r(6, 21, 56, 17, C.plaster);
    r(6, 21, 56, 2, C.wood); r(6, 36, 56, 2, C.wood);
    for (const x of [6, 20, 34, 48, 60]) r(x, 21, 2, 17, C.wood);
    for (const x of [11, 25, 39, 52]) { r(x, 25, 6, 7, C.lamp); r(x + 2, 25, 1, 7, C.woodDark); r(x, 28, 6, 1, C.woodDark); }
    tri(34, 2, 33, 19, C.roofRed); r(1, 20, 66, 2, C.roofRedDark);
    r(50, 4, 5, 11, C.stoneDark); r(49, 3, 7, 2, C.stone);
    r(29, 40, 10, 12, C.woodDark); r(30, 41, 8, 11, C.wood); r(37, 46, 1, 1, C.gold);
    r(44, 40, 1, 2, C.woodDark); r(42, 42, 12, 7, C.wood); r(46, 43, 4, 5, C.gold); r(47, 42, 2, 1, C.steel); // sword sign
  });

  // ---- ป้ายประกาศ: notice board with papers ----
  makeArt(scene, 'bld_board', 30, 32, ({ r, tri }) => {
    tri(15, 0, 15, 7, C.roofRed);
    r(4, 7, 2, 25, C.woodDark); r(24, 7, 2, 25, C.woodDark);
    r(2, 8, 26, 15, C.woodDark); r(3, 9, 24, 13, C.wood);
    r(5, 10, 7, 8, C.paper); r(14, 11, 5, 6, C.paper); r(21, 10, 4, 9, C.paper);
    r(7, 15, 2, 2, C.red); r(15, 12, 3, 1, C.dark); r(15, 14, 3, 1, C.dark); r(6, 12, 5, 1, C.dark);
  });

  // ---- fountain (decoration in the town square) ----
  makeArt(scene, 'deco_fountain', 42, 26, ({ r }) => {
    r(2, 17, 38, 9, C.stone); r(0, 15, 42, 3, C.stoneLight); r(4, 18, 34, 3, C.water);
    r(18, 7, 6, 10, C.stone); r(13, 5, 16, 3, C.stoneLight);
    r(15, 8, 1, 8, C.waterLight); r(26, 8, 1, 8, C.waterLight); r(20, 0, 2, 5, C.waterLight);
  });

  // ---- ตลาด: two striped market stalls ----
  makeArt(scene, 'bld_market', 76, 40, ({ r }) => {
    const stall = (x0: number, a: number, goods: (x: number) => void) => {
      r(x0 + 2, 28, 32, 12, C.wood); r(x0 + 2, 26, 32, 3, C.woodDark);
      r(x0 + 3, 9, 2, 17, C.wood); r(x0 + 31, 9, 2, 17, C.wood);
      for (let i = 0; i < 9; i++) {
        const c = i % 2 ? C.white : a;
        r(x0 + 1 + i * 4, 4, 4, 6, c);
        r(x0 + 2 + i * 4, 10, 2, 1, c);
      }
      goods(x0);
    };
    stall(0, C.red, (x) => {
      r(x + 6, 22, 4, 4, C.red); r(x + 11, 22, 4, 4, C.gold); r(x + 16, 23, 5, 3, C.green);
      r(x + 24, 20, 3, 6, C.purple); r(x + 28, 21, 3, 5, C.blue); r(x + 25, 19, 1, 1, C.white);
    });
    stall(40, C.blue, (x) => {
      r(x + 6, 20, 8, 6, C.wood); r(x + 6, 22, 8, 1, C.woodDark);
      r(x + 17, 21, 5, 5, C.steel); r(x + 18, 19, 3, 2, C.steel);
      r(x + 25, 22, 6, 4, C.gold); r(x + 27, 21, 2, 1, C.crystal);
    });
  });

  // ---- สนามประลอง: colosseum with towers, arches, gate and flags ----
  makeArt(scene, 'bld_arena', 152, 70, ({ r, tri }) => {
    r(10, 22, 132, 48, C.stone);
    for (let x = 10; x < 142; x += 6) r(x, 18, 4, 4, C.stone);
    r(10, 22, 132, 3, C.stoneLight); r(10, 42, 132, 2, C.stoneLight); r(10, 66, 132, 4, C.stoneDark);
    for (let x = 16; x < 136; x += 12) { r(x, 28, 6, 11, C.dark); r(x + 1, 27, 4, 1, C.dark); }
    for (let x = 14; x < 140; x += 14) {
      if (x > 56 && x < 92) continue;
      r(x, 48, 8, 16, C.dark); r(x + 1, 47, 6, 1, C.dark);
    }
    r(62, 38, 28, 32, C.stoneDark); r(65, 43, 22, 27, C.dark); r(67, 41, 18, 2, C.dark);
    for (let x = 67; x < 86; x += 3) r(x, 43, 1, 27, C.steel);
    r(65, 52, 22, 1, C.steel); r(65, 60, 22, 1, C.steel);
    r(71, 31, 10, 6, C.gold); r(74, 29, 4, 2, C.gold); r(75, 32, 2, 4, C.roofRed);
    r(30, 25, 7, 13, C.banner); r(31, 38, 5, 1, C.banner); r(32, 27, 3, 3, C.gold);
    r(115, 25, 7, 13, C.banner); r(116, 38, 5, 1, C.banner); r(117, 27, 3, 3, C.gold);
    for (const tx of [0, 136]) {
      r(tx, 12, 16, 58, C.stone); r(tx + 14, 12, 2, 58, C.stoneDark); r(tx, 12, 2, 58, C.stoneLight);
      r(tx + 6, 24, 4, 6, C.lamp); r(tx + 6, 44, 4, 6, C.lamp);
      tri(tx + 8, 1, 10, 11, C.roofRed);
    }
    r(44, 2, 1, 17, C.woodDark); r(45, 2, 9, 6, C.red); r(45, 8, 6, 1, C.red);
    r(107, 2, 1, 17, C.woodDark); r(108, 2, 9, 6, C.banner); r(108, 8, 6, 1, C.banner);
  });
}

/** Stepped (pixel) triangle drawn straight onto a Graphics object, in screen pixels. */
function stepTri(g: Phaser.GameObjects.Graphics, xc: number, y: number, half: number, h: number, c: number, step = 3) {
  g.fillStyle(c, 1);
  for (let i = 0; i < h; i += step) {
    const hw = Math.round((half * (i + step)) / h / step) * step;
    g.fillRect(xc - hw, y + i, hw * 2, step);
  }
}

/** Width a parallax layer must cover: it scrolls (worldW - viewW) * factor. */
const layerW = (worldW: number, viewW: number, f: number) => Math.ceil((worldW - viewW) * f + viewW);

export function drawTownBackdrop(scene: Phaser.Scene, worldW: number, viewW: number, viewH: number, ground: number) {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // sky (fixed)
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-10);
  const bands = [0x3d5fa8, 0x4f72b8, 0x6587c6, 0x7d9cd3, 0x98b3df, 0xb5cbe8, 0xd5e1ee, 0xf1e6c8];
  bands.forEach((c, i) => sky.fillStyle(c).fillRect(0, i * 24, viewW, 24));
  sky.fillStyle(0xf1e6c8).fillRect(0, bands.length * 24, viewW, viewH);
  sky.fillStyle(0xfff4c2).fillRect(486, 36, 24, 24).fillRect(482, 40, 32, 16).fillRect(490, 32, 16, 32);

  // far mountains + the rulers' castle (barely moves → feels far away)
  const fm = scene.add.graphics().setScrollFactor(0.12).setDepth(-9);
  const fw = layerW(worldW, viewW, 0.12);
  for (let x = -40; x < fw + 80; x += 70 + Math.floor(rnd() * 60)) {
    const h = 70 + Math.floor(rnd() * 70);
    stepTri(fm, x, ground - 40 - h, 60 + Math.floor(rnd() * 40), h + 40, 0x6f7fb6);
    stepTri(fm, x, ground - 40 - h, 15, 18, 0xe6ecf7);
  }
  const cx = Math.round(fw * 0.62);
  const peak = ground - 150;
  stepTri(fm, cx, peak, 110, 150, 0x5d6ca3);
  fm.fillStyle(0x45507f).fillRect(cx - 30, peak - 30, 60, 42); // keep
  for (const [dx, h] of [[-44, 44], [-16, 62], [12, 56], [36, 40]] as const) {
    fm.fillStyle(0x45507f).fillRect(cx + dx, peak + 6 - h, 12, h);
    stepTri(fm, cx + dx + 6, peak + 6 - h - 15, 9, 15, 0x7a3a5a);
    fm.fillStyle(0xffd56b).fillRect(cx + dx + 4, peak + 16 - h, 3, 3);
  }
  fm.fillStyle(0xffd56b).fillRect(cx - 4, peak - 16, 3, 3).fillRect(cx + 6, peak - 10, 3, 3);
  fm.fillStyle(0x3a2b33).fillRect(cx - 11, peak - 92, 2, 18);
  fm.fillStyle(0xe9b949).fillRect(cx - 9, peak - 92, 10, 6);

  // clouds (drift in update)
  const clouds: Phaser.GameObjects.Graphics[] = [];
  const cw = layerW(worldW, viewW, 0.08);
  for (let i = 0; i < 9; i++) {
    const g = scene.add.graphics().setScrollFactor(0.08).setDepth(-8);
    const w = 30 + Math.floor(rnd() * 40);
    g.fillStyle(0xffffff, 0.9).fillRect(0, 6, w, 9).fillRect(6, 0, w - 18, 8).fillRect(w * 0.4, -4, w * 0.35, 6);
    g.setPosition(Math.floor(rnd() * cw), 20 + Math.floor(rnd() * 70));
    clouds.push(g);
  }

  // rolling hills (two layers)
  for (const [f, color, base, amp] of [[0.3, 0x6aa65a, 70, 22], [0.5, 0x548f48, 44, 14]] as const) {
    const g = scene.add.graphics().setScrollFactor(f).setDepth(-7);
    const w = layerW(worldW, viewW, f);
    g.fillStyle(color);
    for (let x = 0; x < w; x += 3) {
      const y = Math.round(ground - base - Math.sin(x * 0.009 + f * 10) * amp - Math.sin(x * 0.027) * amp * 0.4);
      g.fillRect(x, Math.floor(y / 3) * 3, 3, viewH);
    }
  }

  // forest
  const tg = scene.add.graphics().setScrollFactor(0.72).setDepth(-6);
  const tw = layerW(worldW, viewW, 0.72);
  for (let x = 0; x < tw; x += 18 + Math.floor(rnd() * 26)) {
    const h = 36 + Math.floor(rnd() * 34);
    tg.fillStyle(0x4a3424).fillRect(x - 3, ground - 18, 6, 18);
    stepTri(tg, x, ground - h - 6, 15, h - 6, 0x2f6b3a);
    stepTri(tg, x, ground - h - 6, 8, Math.round(h * 0.6), 0x3f8649);
  }

  // ground: grass, dirt road, pebbles
  const gr = scene.add.graphics().setDepth(-5);
  gr.fillStyle(0x6cb04c).fillRect(0, ground - 6, worldW, viewH);
  gr.fillStyle(0x8ccc5c).fillRect(0, ground - 6, worldW, 3);
  gr.fillStyle(0xc9a46a).fillRect(0, ground + 6, worldW, 18);
  gr.fillStyle(0xb08a55).fillRect(0, ground + 6, worldW, 3);
  gr.fillStyle(0x5a9a40).fillRect(0, ground + 24, worldW, viewH);
  for (let i = 0; i < 260; i++) {
    gr.fillStyle(rnd() < 0.5 ? 0xa8875a : 0xdcbc84).fillRect(Math.floor(rnd() * worldW), ground + 9 + Math.floor(rnd() * 13), 3, 3);
  }

  // foreground grass tufts and flowers (in front of everything)
  const fg = scene.add.graphics().setDepth(7);
  const flower = [0xffffff, 0xffd56b, 0xe86a8c, 0x9fd0ff];
  for (let x = 0; x < worldW; x += 9 + Math.floor(rnd() * 20)) {
    const y = ground + 28 + Math.floor(rnd() * (viewH - ground - 32));
    fg.fillStyle(0x4a8a36).fillRect(x, y, 3, 6).fillRect(x + 3, y - 3, 3, 9).fillRect(x + 6, y, 3, 6);
    if (rnd() < 0.3) fg.fillStyle(flower[Math.floor(rnd() * 4)]).fillRect(x + 3, y - 6, 3, 3);
  }

  return { clouds, cloudWrap: cw };
}
