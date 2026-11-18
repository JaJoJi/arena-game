import Phaser from 'phaser';
import { SKILLS, lvOf, nodeOf } from '../sim/skills';
import type { Build, CombatEvent, CombatResult, CooldownTrace, Fx, Side } from '../sim/types';
import { makeTextures } from './sprites';

let resolveReady!: (s: CombatScene) => void;
export const sceneReady = new Promise<CombatScene>((r) => (resolveReady = r));

export const W = 640;
export const H = 300;
const GROUND = 250;
const POS = [205, 435];
const FONT = 'Kanit, sans-serif';
const ARCH_COLOR: Record<string, number> = {
  tank: 0x5aa0e6, burst: 0xe65a5a, scaling: 0xe6b45a, control: 0x7fe0f0, none: 0xaaaaaa,
};
const SIDE_COLOR = ['#9fd3ff', '#ffaaaa'];

export interface PlayData {
  result: CombatResult;
  left: { name: string; build: Build };
  right: { name: string; build: Build };
}

/** Side-view replay: our hero left, enemy right, executing skill in the center. */
export class CombatScene extends Phaser.Scene {
  speed = 2;
  private fighters!: Phaser.GameObjects.Sprite[];
  private bars!: Phaser.GameObjects.Graphics;
  private queue!: Phaser.GameObjects.Graphics;
  private nameTexts!: Phaser.GameObjects.Text[];
  private hpTexts!: Phaser.GameObjects.Text[];
  private skillText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Text;
  /** buff / debuff chips under each HP bar */
  private chips: Phaser.GameObjects.Text[][] = [[], []];
  private fx: (Fx | null)[] = [null, null];
  private fxT = [0, 0];
  /** per-tick cooldown progress (re-simulated locally) for the clock-wipe */
  private trace?: CooldownTrace;
  private lastTick = 0;

  private builds: Build[] = [];
  /** block idx → clock tick until which it glows */
  private glow: Map<number, number>[] = [new Map(), new Map()];
  private maxHp: [number, number] = [40, 40];
  private hp: [number, number] = [40, 40];
  private sh: [number, number] = [0, 0];
  private frozenUntil = [0, 0];
  private flashUntil = [0, 0];
  private evs: CombatEvent[] = [];
  private ei = 0;
  private clock = 0;
  private playing = false;
  private ending = false;
  private quiet = false;
  private onEvent?: (e: CombatEvent) => void;
  private onDone?: () => void;

  constructor() {
    super({ key: 'combat', active: true });
  }

  create() {
    makeTextures(this);
    this.drawBackground();
    this.fighters = [0, 1].map((i) =>
      this.add.sprite(POS[i], GROUND, 'hero_knight').setOrigin(0.5, 1).setScale(3).setFlipX(i === 1),
    );
    this.bars = this.add.graphics();
    this.queue = this.add.graphics();
    const txt = (x: number, y: number, size: number, color = '#ffffff') =>
      this.add
        .text(x, y, '', { fontFamily: FONT, fontSize: size + 'px', color, stroke: '#000000', strokeThickness: 4 })
        .setOrigin(0.5);
    this.nameTexts = [txt(145, 48, 16, SIDE_COLOR[0]), txt(495, 48, 16, SIDE_COLOR[1])];
    this.hpTexts = [txt(145, 24, 14), txt(495, 24, 14)];
    this.skillText = txt(W / 2, 100, 26);
    this.clockText = txt(W / 2, 24, 14, '#bbbbbb');
    this.banner = txt(W / 2, 170, 48);
    for (const s of [0, 1])
      for (let i = 0; i < 8; i++)
        this.chips[s].push(
          this.add
            .text(0, 0, '', { fontFamily: FONT, fontSize: '11px', color: '#ffffff', backgroundColor: '#000000aa', padding: { x: 4, y: 1 } })
            .setOrigin(0, 0)
            .setVisible(false),
        );
    this.idle(null);
    resolveReady(this);
  }

  private drawBackground() {
    const g = this.add.graphics();
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    // afternoon sky above the colosseum
    const bands = [0x3d5fa8, 0x5276bb, 0x6a8cc8, 0x86a4d6];
    bands.forEach((c, i) => g.fillStyle(c).fillRect(0, i * 18, W, 18));
    // stands: stone tiers packed with a cheering crowd
    const top = 72;
    g.fillStyle(0x8a7c6a).fillRect(0, top, W, GROUND - top);
    for (let x = 0; x < W; x += 12) g.fillStyle(0x8a7c6a).fillRect(x, top - 6, 8, 6); // crenellations
    const crowd = [0xe0a070, 0xc0603c, 0x4f72b8, 0xe9b949, 0x7b3fa0, 0xf3efe6, 0x5aa04a, 0x9a3a3a];
    for (let row = 0; row < 6; row++) {
      const y = top + 8 + row * 18;
      g.fillStyle(0x6e6252).fillRect(0, y + 12, W, 4); // tier edge
      for (let x = 2; x < W; x += 6) {
        if (rnd() < 0.85) {
          g.fillStyle(crowd[Math.floor(rnd() * crowd.length)]).fillRect(x, y + 4, 4, 6);
          g.fillStyle(0xe8c49a).fillRect(x + 1, y + 1, 2, 3); // heads
        }
      }
    }
    // royal box in the middle with banners
    g.fillStyle(0x6e6252).fillRect(W / 2 - 50, top - 22, 100, 34);
    g.fillStyle(0x7b3fa0).fillRect(W / 2 - 44, top - 16, 88, 22);
    g.fillStyle(0xe9b949).fillRect(W / 2 - 44, top - 16, 88, 3).fillRect(W / 2 - 6, top - 12, 12, 10);
    for (const bx of [60, 180, 440, 560]) {
      g.fillStyle(bx < W / 2 ? 0xb5463c : 0x3e5fae).fillRect(bx, top, 16, 34);
      g.fillStyle(0xe9b949).fillRect(bx, top, 16, 3).fillRect(bx + 5, top + 10, 6, 6);
      g.fillStyle(bx < W / 2 ? 0xb5463c : 0x3e5fae).fillRect(bx + 3, top + 34, 10, 3);
    }
    // arena wall with dark gates
    g.fillStyle(0x6b5f50).fillRect(0, GROUND - 36, W, 36);
    g.fillStyle(0x7d705e).fillRect(0, GROUND - 36, W, 4);
    for (const gx of [30, 300, 580]) {
      g.fillStyle(0x1d1612).fillRect(gx, GROUND - 30, 30, 30).fillRect(gx + 3, GROUND - 33, 24, 3);
      g.fillStyle(0xaab4c0);
      for (let x = gx + 3; x < gx + 30; x += 5) g.fillRect(x, GROUND - 30, 1, 30);
    }
    for (const tx of [120, 240, 400, 520]) {
      g.fillStyle(0x4a3424).fillRect(tx, GROUND - 30, 3, 16);
      g.fillStyle(0xffb347).fillRect(tx - 2, GROUND - 36, 7, 6);
      g.fillStyle(0xffe08a).fillRect(tx, GROUND - 38, 3, 4);
    }
    // sand floor
    g.fillStyle(0xd8b878).fillRect(0, GROUND, W, H - GROUND);
    g.fillStyle(0xc4a262).fillRect(0, GROUND, W, 3);
    for (let i = 0; i < 120; i++) {
      g.fillStyle(rnd() < 0.5 ? 0xc4a262 : 0xe6cc94).fillRect(Math.floor(rnd() * W), GROUND + 6 + Math.floor(rnd() * 40), 3, 2);
    }
  }

  /** Shop / menu: show our hero standing alone. */
  idle(hero: string | null) {
    this.playing = false;
    this.tweens.killAll();
    this.banner.setText('');
    this.skillText.setText('');
    this.clockText.setText('');
    this.bars.clear();
    this.queue.clear();
    this.hpTexts.forEach((t) => t.setText(''));
    this.fx = [null, null];
    this.chips.forEach((row) => row.forEach((c) => c.setVisible(false)));
    this.nameTexts.forEach((t) => t.setText(''));
    this.fighters.forEach((f, i) => {
      f.stop();
      f.chain();
      f.setAngle(0).setAlpha(1).clearTint().setX(POS[i]);
      f.setVisible(false);
    });
    if (hero) {
      this.fighters[0].setTexture('hero_' + hero).setVisible(true).setX(W / 2).play('idle_' + hero);
    }
  }

  play(data: PlayData, onEvent: (e: CombatEvent) => void, onDone: () => void) {
    this.idle(null);
    this.builds = [data.left.build, data.right.build];
    [data.left, data.right].forEach((side, i) => {
      this.fighters[i].setTexture('hero_' + side.build.hero).setVisible(true).setX(POS[i]).play({ key: 'idle_' + side.build.hero, delay: i * 250 });
      this.nameTexts[i].setText(side.name);
    });
    this.maxHp = [...data.result.maxHp];
    this.hp = [...data.result.init.hp];
    this.sh = [...data.result.init.sh];
    this.fx = [...data.result.init.fx];
    this.fxT = [0, 0];
    this.glow = [new Map(), new Map()];
    this.frozenUntil = [0, 0];
    this.evs = data.result.events;
    this.trace = data.result.trace;
    this.lastTick = data.result.ticks;
    this.ei = 0;
    this.clock = 0;
    this.ending = false;
    this.onEvent = onEvent;
    this.onDone = onDone;
    this.drawBars();
    this.drawQueue();
    this.playing = true;
  }

  skip() {
    if (!this.playing) return;
    this.quiet = true;
    while (this.ei < this.evs.length) this.handle(this.evs[this.ei++]);
    this.quiet = false;
    this.clock = this.evs.at(-1)?.t ?? 0;
  }

  update(_t: number, delta: number) {
    if (!this.playing) return;
    this.clock += (delta * this.speed) / 100; // 100ms per tick at 1x
    while (this.ei < this.evs.length && this.evs[this.ei].t <= this.clock) this.handle(this.evs[this.ei++]);
    this.drawQueue();
    this.drawChips();
    const lastT = this.evs.at(-1)?.t ?? 0;
    this.clockText.setText((Math.min(this.clock, lastT) / 10).toFixed(1) + ' วิ');
    const now = this.time.now;
    this.fighters.forEach((f, i) => {
      if (now < this.flashUntil[i]) f.setTintFill(0xffffff);
      else if (this.clock < this.frozenUntil[i]) f.setTint(0x88ccff);
      else f.clearTint();
    });
    if (this.ei >= this.evs.length && !this.ending) {
      this.ending = true;
      this.time.delayedCall(1400, () => {
        this.playing = false;
        this.onDone?.();
      });
    }
  }

  /** Short cast / hit pose, then back to the idle loop. Ignored once the fighter is down. */
  private pose(side: number, kind: 'cast' | 'hit') {
    const f = this.fighters[side];
    const hero = this.builds[side]?.hero;
    if (!hero || f.anims.currentAnim?.key === 'dead_' + hero) return;
    if (kind === 'hit' && f.anims.currentAnim?.key === 'cast_' + hero && f.anims.isPlaying) return; // casting wins
    f.chain();
    f.play({ key: `${kind}_${hero}`, frameRate: Math.min(30, (kind === 'cast' ? 8 : 10) * Math.max(1, this.speed * 0.6)) }).chain('idle_' + hero);
  }

  private dur(ms: number) {
    return ms / Math.max(1, this.speed * 0.6);
  }

  private float(side: number, text: string, color: string, dy = 0) {
    if (this.quiet) return;
    const t = this.add
      .text(POS[side] + Phaser.Math.Between(-24, 24), GROUND - 110 + dy, text, {
        fontFamily: FONT, fontSize: '20px', color, stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: this.dur(900), onComplete: () => t.destroy() });
  }

  private handle(e: CombatEvent) {
    this.hp = [...e.s.hp];
    this.sh = [...e.s.sh];
    if (e.s.fx) {
      this.fx = [...e.s.fx];
      this.fxT = [e.t, e.t];
    }
    switch (e.type) {
      case 'cast': {
        const d = SKILLS[e.skill];
        this.glow[e.side].set(e.idx, e.t + 5);
        if (!this.quiet) {
          const f = this.fighters[e.side];
          const dir = e.side === 0 ? 1 : -1;
          this.tweens.killTweensOf(f);
          f.setX(POS[e.side]);
          this.tweens.add({ targets: f, x: POS[e.side] + dir * 26, duration: this.dur(90), yoyo: true });
          this.pose(e.side, 'cast');
          const inst = this.builds[e.side]?.skills[e.idx];
          const label = `${e.side === 0 ? '▶ ' : ''}${inst ? nodeOf(inst).name : d.name} Lv${e.lv}${e.echo ? ' (ซ้ำ)' : ''}${e.side === 1 ? ' ◀' : ''}`;
          this.skillText.setText(label).setColor(SIDE_COLOR[e.side]).setAlpha(1).setScale(1);
          this.tweens.killTweensOf(this.skillText);
          this.tweens.add({ targets: this.skillText, alpha: 0, delay: this.dur(500), duration: this.dur(400) });
        }
        break;
      }
      case 'damage': {
        const color = e.src === 'burn' ? '#ff9933' : e.src === 'fatigue' ? '#bbbbbb' : e.src === 'thorns' ? '#c9a0ff' : '#ff5555';
        if (e.amount > 0) this.float(e.side, `-${e.amount}`, color);
        if (e.blocked > 0) this.float(e.side, `(${e.blocked})`, '#7fc8ff', 22);
        if (!this.quiet && e.amount > 0) {
          this.flashUntil[e.side] = this.time.now + 70;
          if (e.src !== 'fatigue' && e.src !== 'burn') this.pose(e.side, 'hit');
          if (e.amount >= 10) this.cameras.main.shake(140, 0.008);
        }
        break;
      }
      case 'shield':
        this.float(e.side, `+${e.amount} โล่`, '#7fc8ff');
        break;
      case 'heal':
        this.float(e.side, `+${e.amount}`, '#66ff88');
        break;
      case 'status': {
        const map: Record<string, [string, string]> = {
          freeze: [e.value > 0 ? 'แช่แข็ง!' : 'ต้านได้', '#aee6ff'],
          slow: ['ช้าลง', '#aee6ff'],
          burn: ['ติดไฟ', '#ff9933'],
          grow: [`พลัง ${e.value}`, '#ffd166'],
          charge: [`x${e.value}`, '#ffd166'],
          thorns: ['หนาม', '#c9a0ff'],
          steadfast: ['ใจเหล็ก', '#ffffff'],
          rage: ['คลั่ง!', '#ff4444'],
          amplify: [e.value > 0 ? 'บัฟ x2!' : 'ยังไม่มีบัฟ', '#ffd166'],
          cleanse: [e.value > 0 ? `ชำระล้าง ${e.value}` : 'ไม่มีดีบัฟ', '#aaffcc'],
          dispel: [e.value > 0 ? `สลายบัฟ ${e.value}!` : 'ไม่มีบัฟให้ลบ', '#c9a0ff'],
          delay: [e.value > 0 ? `ถอยเวลา ${(e.value / 10).toFixed(1)} วิ` : 'ต้านได้', '#b8a0ff'],
        };
        const [txt, col] = map[e.status] ?? [e.status, '#ffffff'];
        this.float(e.side, txt, col, -24);
        if (e.status === 'freeze' && e.value > 0) this.frozenUntil[e.side] = e.t + e.value;
        break;
      }
      case 'fatigue':
        if (!this.quiet) this.skillText.setText(`เหนื่อยล้า -${e.amount}`).setColor('#cccccc').setAlpha(1);
        break;
      case 'end': {
        const w = e.winner;
        this.banner.setText(w === 0 ? 'ชนะ!' : w === 1 ? 'แพ้' : 'เสมอ').setColor(w === 0 ? '#66ff88' : w === 1 ? '#ff6666' : '#dddddd');
        this.banner.setScale(0.5);
        this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.Out' });
        ([0, 1] as Side[]).forEach((s) => {
          if (w !== -1 && s !== w) {
            const f = this.fighters[s];
            f.stop();
            f.chain();
            f.play('dead_' + this.builds[s].hero);
          }
        });
        break;
      }
    }
    this.drawBars();
    this.onEvent?.(e);
  }

  private drawBars() {
    const g = this.bars.clear();
    for (const s of [0, 1]) {
      const x0 = s === 0 ? 20 : 370;
      const w = 250;
      const hpW = Math.max(0, Math.round((w * this.hp[s]) / this.maxHp[s]));
      const shW = Math.min(w, Math.round((w * this.sh[s]) / this.maxHp[s]));
      g.fillStyle(0x000000).fillRect(x0 - 2, 12, w + 4, 26);
      g.fillStyle(0x3a1d1d).fillRect(x0, 14, w, 22);
      g.fillStyle(this.hp[s] / this.maxHp[s] > 0.35 ? 0x4fd16b : 0xe0a030);
      g.fillRect(s === 0 ? x0 : x0 + w - hpW, 14, hpW, 22);
      if (shW > 0) {
        g.fillStyle(0x7fc8ff);
        g.fillRect(s === 0 ? x0 : x0 + w - shW, 14, shW, 6);
      }
      this.hpTexts[s].setText(`${Math.max(0, this.hp[s])}/${this.maxHp[s]}${this.sh[s] ? `  โล่ ${this.sh[s]}` : ''}`);
    }
  }

  /** Buff chips (gold) then debuff chips (red) under each HP bar. Timed debuffs count down. */
  private drawChips() {
    for (const s of [0, 1]) {
      const f = this.fx[s];
      const row = this.chips[s];
      const list: [string, string][] = [];
      if (f) {
        const since = Math.max(0, this.clock - this.fxT[s]);
        const fr = Math.max(0, f.fr - since);
        const slt = Math.max(0, f.slt - since);
        if (f.g > 0) list.push([`พลัง +${f.g}`, '#ffd166']);
        if (f.c > 1) list.push([`รวมพลัง x${+f.c.toFixed(2)}`, '#ffd166']);
        if (f.th > 0) list.push([`หนาม ${f.th}`, '#ffd166']);
        if (f.sf) list.push(['ใจเหล็ก', '#ffd166']);
        if (f.b > 0) list.push([`ไฟ ${f.b}/วิ`, '#ff7b5c']);
        if (fr > 0) list.push([`แช่แข็ง ${(fr / 10).toFixed(1)}`, '#8fd8ff']);
        if (f.sl > 0 && slt > 0) list.push([`ช้า ${f.sl}%`, '#8fd8ff']);
      }
      let x = s === 0 ? 20 : 370;
      let y = 62;
      row.forEach((c, i) => {
        const item = list[i];
        if (!item) return c.setVisible(false);
        const buff = item[1] === '#ffd166';
        c.setText(item[0]).setColor(item[1]).setBackgroundColor(buff ? '#2a2108dd' : '#2a0b0bdd').setVisible(true);
        if (x + c.width > (s === 0 ? 270 : 620)) {
          x = s === 0 ? 20 : 370;
          y += 18;
        }
        c.setPosition(x, y);
        x += c.width + 4;
      });
    }
  }

  /**
   * Each fighter's skill list beside them, top to bottom: a colour chip per skill and a cooldown bar
   * that fills as the cooldown runs. A skill flashes white when it fires; bars turn ice-blue while frozen.
   */
  private drawQueue() {
    const g = this.queue.clear();
    const rowH = 13;
    const barW = 54;
    const tick = Math.max(0, Math.min(this.lastTick, Math.floor(this.clock)));
    for (const s of [0, 1]) {
      const b = this.builds[s];
      if (!b || !b.skills.length) continue;
      const n = b.skills.length;
      const w = 14 + barW;
      const ox = s === 0 ? 12 : W - 12 - w;
      const oy = GROUND - 8 - n * rowH;
      g.fillStyle(0x0b0e13, 0.82).fillRoundedRect(ox - 4, oy - 4, w + 8, n * rowH + 6, 4);
      g.lineStyle(1, 0x3a424d).strokeRoundedRect(ox - 4, oy - 4, w + 8, n * rowH + 6, 4);
      const frozen = this.trace ? this.trace.fr[s][tick] === 1 : false;
      b.skills.forEach((k, i) => {
        const y = oy + i * rowH;
        const color = ARCH_COLOR[SKILLS[k.id]?.arch ?? 'none'];
        const lit = (this.glow[s].get(i) ?? -1) >= this.clock;
        g.fillStyle(lit ? 0xffffff : color, 1).fillRect(ox, y, 10, 10);
        // level pips under the chip
        g.fillStyle(0xffffff, 0.85);
        for (let l = 0; l < lvOf(k.v); l++) g.fillRect(ox + l * 3, y + 10, 2, 1);
        const bx = ox + 14;
        g.fillStyle(0x000000, 0.6).fillRect(bx, y + 2, barW, 6);
        const ratio = lit ? 1 : this.trace ? this.trace.p[s][tick * this.trace.n[s] + i] / 255 : 0;
        if (ratio > 0.01) {
          g.fillStyle(lit ? 0xffffff : frozen && k.mark !== 'steadfast' ? 0x8fd8ff : ratio > 0.9 ? 0xffffff : color, 1);
          g.fillRect(bx, y + 2, Math.round(barW * ratio), 6);
        }
      });
      if (frozen) g.lineStyle(2, 0x8fd8ff, 0.9).strokeRect(ox - 2, oy - 2, w + 4, n * rowH + 2);
    }
  }
}
