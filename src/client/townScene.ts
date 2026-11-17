import Phaser from 'phaser';
import { HEROES } from '../sim/heroes';
import { makeTextures } from './sprites';
import { drawTownBackdrop, makeTownArt } from './townArt';
import { BUILDINGS, BUILDING_BY_ID, WORLD_W } from './townData';

let resolveTown!: (s: TownScene) => void;
export const townReady = new Promise<TownScene>((r) => (resolveTown = r));

const W = 640;
const H = 300;
const GROUND = 258;
const SCALE = 3;
const FONT = 'Kanit, sans-serif';
const TAP_SLOP = 8; // px a pointer may move and still count as a tap
// minimap bar
const MX = 170;
const MW = 300;
const MH = 14;
const MY = 300 - MH - 4; // bottom strip, below the road, so tall buildings' labels never collide

/** Side-scrolling town: drag left/right, tap a landmark. */
export class TownScene extends Phaser.Scene {
  onSelect?: (id: string) => void;
  private images = new Map<string, Phaser.GameObjects.Image>();
  private labels = new Map<string, Phaser.GameObjects.Text>();
  private selected: string | null = null;
  private arrow!: Phaser.GameObjects.Graphics;
  private mini!: Phaser.GameObjects.Graphics;
  private clouds: Phaser.GameObjects.Graphics[] = [];
  private cloudWrap = 0;
  private dragging = false;
  private onMini = false;
  private downX = 0;
  private downScroll = 0;
  private moved = 0;
  private vel = 0; // px per ms, for inertia
  private lastX = 0;
  private lastT = 0;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor() {
    super({ key: 'town', active: true });
  }

  private clamp(x: number) {
    return Phaser.Math.Clamp(x, 0, WORLD_W - W);
  }

  create() {
    makeTextures(this);
    makeTownArt(this);
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W, H);

    const bd = drawTownBackdrop(this, WORLD_W, W, H, GROUND);
    this.clouds = bd.clouds;
    this.cloudWrap = bd.cloudWrap;

    this.add.image(1450, GROUND + 4, 'deco_fountain').setOrigin(0.5, 1).setScale(SCALE).setDepth(2);

    for (const b of BUILDINGS) {
      const img = this.add
        .image(b.x, GROUND + 4, 'bld_' + b.id)
        .setOrigin(0.5, 1)
        .setScale(SCALE)
        .setDepth(2)
        .setInteractive({ useHandCursor: true });
      img.on('pointerover', () => img.setTint(0xfff1c8));
      img.on('pointerout', () => img.clearTint());
      const label = this.add
        .text(b.x, img.y - img.displayHeight - 6, b.name, {
          fontFamily: FONT, fontSize: '16px', color: '#ffffff', stroke: '#1d1612', strokeThickness: 5,
        })
        .setOrigin(0.5, 1)
        .setDepth(6);
      this.images.set(b.id, img);
      this.labels.set(b.id, label);
    }

    // townsfolk: the heroes wander between the buildings
    const ranges: [number, number][] = [[900, 1250], [980, 1500], [1250, 1750], [600, 1100]];
    HEROES.forEach((h, i) => {
      const [a, b] = ranges[i % ranges.length];
      const s = this.add.sprite(Phaser.Math.Between(a, b), GROUND + 20, 'hero_' + h.id).setOrigin(0.5, 1).setScale(1.25).setDepth(5);
      this.tweens.add({ targets: s, y: s.y - 2, duration: 160, yoyo: true, repeat: -1 });
      this.wander(s, a, b);
    });

    this.arrow = this.add.graphics().setDepth(8);
    this.arrow.fillStyle(0xffd56b);
    for (let i = 0; i < 4; i++) this.arrow.fillRect(-8 + i * 2, i * 3, 16 - i * 4, 3);
    this.arrow.setVisible(false);

    this.mini = this.add.graphics().setScrollFactor(0).setDepth(10);

    // ---- input: drag to scroll, tap to select, minimap to jump ----
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.inMini(p)) {
        this.onMini = true;
        this.jumpMini(p.x);
        return;
      }
      this.tweens.killTweensOf(cam);
      this.dragging = true;
      this.downX = this.lastX = p.x;
      this.downScroll = cam.scrollX;
      this.moved = 0;
      this.vel = 0;
      this.lastT = this.time.now;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.onMini && p.isDown) return this.jumpMini(p.x);
      if (!this.dragging) return;
      cam.scrollX = this.clamp(this.downScroll - (p.x - this.downX));
      this.moved = Math.max(this.moved, Math.abs(p.x - this.downX));
      const now = this.time.now;
      const dt = now - this.lastT;
      if (dt > 0) this.vel = (-(p.x - this.lastX) / dt) * 0.6 + this.vel * 0.4;
      this.lastX = p.x;
      this.lastT = now;
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (this.onMini) {
        this.onMini = false;
        return;
      }
      if (!this.dragging) return;
      this.dragging = false;
      if (this.moved < TAP_SLOP) {
        this.vel = 0;
        this.tap(p);
      } else if (this.time.now - this.lastT > 90) {
        this.vel = 0; // held still before releasing → no fling
      }
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.input.on('wheel', (_p: unknown, _o: unknown, dx: number, dy: number) => {
      this.tweens.killTweensOf(cam);
      this.vel = 0;
      cam.scrollX = this.clamp(cam.scrollX + dx + dy);
    });
    this.cursors = this.input.keyboard?.createCursorKeys();

    cam.scrollX = this.clamp(BUILDING_BY_ID.hall.x - W / 2);
    resolveTown(this);
  }

  private wander(s: Phaser.GameObjects.Sprite, a: number, b: number) {
    const tx = Phaser.Math.Between(a, b);
    s.setFlipX(tx < s.x);
    this.tweens.add({
      targets: s,
      x: tx,
      duration: Math.abs(tx - s.x) * 28 + 200,
      onComplete: () => this.time.delayedCall(Phaser.Math.Between(600, 2800), () => this.wander(s, a, b)),
    });
  }

  private inMini(p: Phaser.Input.Pointer) {
    return p.y >= MY - 6 && p.x >= MX - 4 && p.x <= MX + MW + 4;
  }

  private jumpMini(x: number) {
    this.vel = 0;
    this.tweens.killTweensOf(this.cameras.main);
    this.cameras.main.scrollX = this.clamp(((x - MX) / MW) * WORLD_W - W / 2);
  }

  private tap(p: Phaser.Input.Pointer) {
    const wp = this.cameras.main.getWorldPoint(p.x, p.y);
    for (const b of [...BUILDINGS].reverse()) {
      const img = this.images.get(b.id)!;
      const lbl = this.labels.get(b.id)!;
      if (img.getBounds().contains(wp.x, wp.y) || lbl.getBounds().contains(wp.x, wp.y)) {
        this.setSelected(b.id);
        this.onSelect?.(b.id);
        return;
      }
    }
  }

  /** Highlight a building without moving the camera. */
  setSelected(id: string | null) {
    this.selected = id;
    for (const [bid, lbl] of this.labels) lbl.setColor(bid === id ? '#ffd56b' : '#ffffff');
    this.arrow.setVisible(!!id);
  }

  /** Scroll smoothly to a building and select it. */
  focus(id: string) {
    const b = BUILDING_BY_ID[id];
    if (!b) return;
    this.setSelected(id);
    this.vel = 0;
    const cam = this.cameras.main;
    this.tweens.killTweensOf(cam);
    this.tweens.add({ targets: cam, scrollX: this.clamp(b.x - W / 2), duration: 450, ease: 'Sine.easeInOut' });
  }

  update(time: number, delta: number) {
    const cam = this.cameras.main;
    for (const c of this.clouds) {
      c.x += delta * 0.006;
      if (c.x > this.cloudWrap + 60) c.x = -80;
    }
    if (!this.dragging && Math.abs(this.vel) > 0.02) {
      cam.scrollX = this.clamp(cam.scrollX + this.vel * delta);
      this.vel *= Math.pow(0.9, delta / 16);
    } else if (!this.dragging) this.vel = 0;
    if (this.cursors?.left.isDown) cam.scrollX = this.clamp(cam.scrollX - 0.5 * delta);
    if (this.cursors?.right.isDown) cam.scrollX = this.clamp(cam.scrollX + 0.5 * delta);

    if (this.selected) {
      const lbl = this.labels.get(this.selected)!;
      this.arrow.setPosition(lbl.x, lbl.y - lbl.height - 14 + Math.sin(time / 180) * 3);
    }
    this.drawMini();
  }

  private drawMini() {
    const g = this.mini.clear();
    const sx = this.cameras.main.scrollX;
    g.fillStyle(0x000000, 0.45).fillRect(MX - 4, MY - 2, MW + 8, MH + 4);
    g.fillStyle(0x6cb04c, 0.9).fillRect(MX, MY + MH - 3, MW, 3);
    for (const b of BUILDINGS) {
      const x = Math.round(MX + (b.x / WORLD_W) * MW);
      const color = b.id === 'arena' ? 0xffd56b : b.open ? 0xffffff : 0x9aa4ad;
      g.fillStyle(color).fillRect(x - 2, MY + 2, b.id === 'arena' ? 6 : 4, MH - 6);
      if (b.id === this.selected) g.lineStyle(1, 0xffd56b).strokeRect(x - 4, MY, 9, MH - 2);
    }
    g.lineStyle(2, 0xffffff, 0.9).strokeRect(MX + (sx / WORLD_W) * MW, MY - 1, (W / WORLD_W) * MW, MH + 2);
  }
}
