import { HEROES, HEROES_BY_ID } from './heroes';
import { Rng, hashSeed } from './rng';
import { DX, DY, activeBonuses, cellsOf, footprint, matches, shapeSize } from './grid';
import { BAG_MAX, MAX_LV, buy, gridOf, newRun, priceOf, reroll, toBuild, PRICE, REROLL, type RunState } from './run';
import { SKILLS } from './skills';
import { ARCHES, type Archetype, type Build, type Rot } from './types';

/**
 * Rule-based bot (no LLM). Plays through the same run API as a human.
 * Used for: AI opponents when there are few player builds, balance testing,
 * and later the player-configured bots (โควตา/กฎ in the vision doc).
 */
export interface BotRules {
  /** archetypes in priority order */
  prefer: Archetype[];
  /** gold to keep after rerolling */
  reserve: number;
  maxRerolls: number;
}

export function botShopTurn(s: RunState, rules: BotRules) {
  let rerolls = 0;
  const want = HEROES_BY_ID[s.hero]?.botWant ?? [];
  for (let guard = 0; guard < 40; guard++) {
    let best = -1;
    let bestScore = 0;
    const { w, h } = gridOf(s);
    const used = s.skills.reduce((n, k) => n + shapeSize(k.shape), 0);
    s.shop.forEach((offer, i) => {
      if (!offer) return;
      const id = offer.id;
      const d = SKILLS[id];
      if (priceOf(id) > s.gold) return;
      const owned = s.skills.find((k) => k.id === id);
      let score: number;
      if (owned) score = owned.lv < MAX_LV ? 3 : -1;
      else if (used + shapeSize(offer.shape) > w * h) score = -1;
      else score = s.skills.length < 2 ? 2 : 1;
      if (score < 0) return;
      const pi = rules.prefer.indexOf(d.arch as Archetype);
      if (pi >= 0) score += 3 - pi;
      if (d.hero) score += 3;
      if (want.includes(id)) score += 2;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0 && bestScore >= 2) {
      buy(s, best);
      continue;
    }
    if (rerolls < rules.maxRerolls && s.gold >= REROLL + PRICE + rules.reserve) {
      reroll(s);
      rerolls++;
      continue;
    }
    break;
  }
  arrange(s);
}

const BONUS_W = { trigger: 2, power: 1.5, haste: 1.2, dmg: 1.5, shield: 1 } as const;

/** Greedy packing: biggest blocks first, each at the spot that turns on the most connect bonuses. */
export function arrange(s: RunState) {
  arrangeOrder(s, biggestFirst(s));
}

const biggestFirst = (s: RunState) =>
  s.skills.map((_, i) => i).sort((a, b) => shapeSize(s.skills[b].shape) - shapeSize(s.skills[a].shape) || a - b);

/**
 * Score of the current layout: every placed block counts far more than bonuses (never leave a skill out to win a
 * bonus), then the weight of every active connect bonus. -Infinity when the bag would overflow.
 */
export function layoutScore(s: RunState): number {
  const { w, h } = gridOf(s);
  const bagged = s.skills.filter((k) => k.x < 0).length;
  if (bagged > BAG_MAX) return -Infinity;
  let score = (s.skills.length - bagged) * 1000;
  for (const a of activeBonuses(s.skills, w, h)) score += BONUS_W[a.b.e] * 10;
  return score;
}

export interface AutoResult {
  /** active connect bonuses before / after */
  before: number;
  after: number;
  /** false when the current layout was already the best found (nothing moved) */
  changed: boolean;
}

/**
 * Auto-arrange for players: run the greedy packing with the biggest-first order and many seeded shuffles,
 * keep the layout with the best score. Never returns a worse layout than the current one. Deterministic.
 */
export function autoArrange(s: RunState, tries = 80): AutoResult {
  const { w, h } = gridOf(s);
  const snapshot = () => s.skills.map((k) => ({ x: k.x, y: k.y, rot: k.rot }));
  const restore = (l: { x: number; y: number; rot: Rot }[]) => l.forEach((p, i) => Object.assign(s.skills[i], p));
  const original = snapshot();
  const before = activeBonuses(s.skills, w, h).length;
  let best = original;
  let bestScore = layoutScore(s);
  const rng = new Rng(hashSeed(s.seed, s.day, s.skills.length, 'auto'));
  for (let t = 0; t < tries; t++) {
    let order = biggestFirst(s);
    if (t > 0) {
      // shuffle, but keep a bias towards big blocks first so everything still fits
      order = order
        .map((i, rank) => ({ i, key: rank + rng.next() * s.skills.length * (t % 3 === 0 ? 0.5 : 1.5) }))
        .sort((a, b) => a.key - b.key)
        .map((x) => x.i);
    }
    arrangeOrder(s, order);
    const sc = layoutScore(s);
    if (sc > bestScore) {
      bestScore = sc;
      best = snapshot();
    }
  }
  restore(best);
  const changed = best !== original;
  return { before, after: activeBonuses(s.skills, w, h).length, changed };
}

/** Greedy packing in a given order: each block goes to the spot (and rotation) that turns on the most bonuses. */
function arrangeOrder(s: RunState, order: number[]) {
  const { w, h } = gridOf(s);
  for (const k of s.skills) Object.assign(k, { x: -1, y: -1 });
  // occupancy of blocks placed so far (blocks are placed one by one, so this only grows)
  const g = new Int16Array(w * h).fill(-1);
  for (const i of order) {
    const k = s.skills[i];
    let best: { x: number; y: number; rot: Rot; cells: [number, number][] } | null = null;
    let bestScore = -Infinity;
    for (let r = 0; r < 4; r++) {
      const rot = r as Rot;
      const shape = cellsOf(k.shape, rot);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const cells = shape.map(([cx, cy]) => [x + cx, y + cy] as [number, number]);
          if (!cells.every(([cx, cy]) => cx < w && cy < h && g[cy * w + cx] === -1)) continue;
          // touching placed blocks
          const touch = new Set<number>();
          for (const [cx, cy] of cells)
            for (let d = 0; d < 4; d++) {
              const nx = cx + DX[d];
              const ny = cy + DY[d];
              if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
              const j = g[ny * w + nx];
              if (j >= 0) touch.add(j);
            }
          // only bonuses involving block i change: its own (any touching match) and each neighbour's (i matches)
          let score = -0.001 * (y * w + x);
          for (const b of k.bonus) if ([...touch].some((j) => matches(b.t, s.skills[j]))) score += BONUS_W[b.e];
          for (const j of touch) {
            const nb = s.skills[j];
            for (const b of nb.bonus) {
              if (!matches(b.t, k)) continue;
              // only counts if no other neighbour of j already turns it on
              if (!neighbourMatch(s, g, w, h, j, b.t)) score += BONUS_W[b.e];
            }
          }
          if (score > bestScore) {
            bestScore = score;
            best = { x, y, rot, cells };
          }
        }
    }
    if (best) {
      Object.assign(k, { x: best.x, y: best.y, rot: best.rot });
      for (const [cx, cy] of best.cells) g[cy * w + cx] = i;
    }
  }
}

/** Does any block already touching placed block j match condition t? */
function neighbourMatch(s: RunState, g: Int16Array, w: number, h: number, j: number, t: string) {
  for (const [cx, cy] of footprint(s.skills[j]))
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const o = g[ny * w + nx];
      if (o >= 0 && o !== j && matches(t, s.skills[o])) return true;
    }
  return false;
}

/** Build a bot's build as of `day`, by running its shop turns day by day. */
export function aiBuild(hero: string, day: number, prefer: Archetype[], seed: number): Build {
  const s = newRun(hero, seed, 'ai');
  const rules: BotRules = { prefer, reserve: 0, maxRerolls: 2 };
  for (let d = 1; d <= day; d++) {
    if (d > 1) {
      s.day = d;
      const inc = 5 + Math.min(Math.floor(d / 2), 3);
      s.gold += inc;
      s.rolls = 0;
      reroll(s); // costs 1, but gives a fresh shop for the day
      s.gold += 1;
    }
    botShopTurn(s, rules);
  }
  return toBuild(s);
}

export function randomAiBuild(day: number, seed: number): Build {
  const rng = new Rng(seed);
  const hero = rng.pick(HEROES);
  const second = rng.pick(ARCHES.filter((a) => a !== hero.arch));
  return aiBuild(hero.id, day, [hero.arch, second], hashSeed(seed, 'ai'));
}
