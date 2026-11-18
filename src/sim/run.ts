import { Rng, hashSeed } from './rng';
import { MAX_BONUS, MAX_H, MAX_W, findSpot, fits, rollBonus, rollOffer, type Offer } from './grid';
import { HEROES } from './heroes';
import { SKILLS, SKILL_LIST } from './skills';
import type { Build, Mark, Rot, SkillInstance } from './types';

/** One run (รอบ) of the game: pick skills day by day until 8 wins or HP runs out. */

export const START_HP = 20;
export const WIN_TARGET = 8;
export const SHOP_SIZE = 3;
export const PRICE = 3;
export const UNIQUE_PRICE = 4;
export const REROLL = 1;
export const MAX_LV = 5;
/** ตื่นพลัง (last chance) raises skills to this level */
export const AWAKEN_LV = 3;
export const BAG_MAX = 6;

/** Heroes offered when a run starts (5 later with the pass). */
export const HERO_CHOICES = 3;

/**
 * The heroes a run may start with: `n` heroes from different archetypes, rolled from the seed.
 * Same seed → same choices, so the server can check the pick later (Phase 2).
 */
export function heroChoices(seed: number, n = HERO_CHOICES): string[] {
  const rng = new Rng(hashSeed(seed, 'heroes'));
  const arches = [...new Set(HEROES.map((h) => h.arch))];
  const out: string[] = [];
  while (out.length < n && arches.length) {
    const arch = arches.splice(rng.int(arches.length), 1)[0];
    out.push(rng.pick(HEROES.filter((h) => h.arch === arch)).id);
  }
  return out;
}

export type LastChanceOption = 'awaken' | 'mark' | 'supply';
export const MARKS: Mark[] = ['burn', 'echo', 'quick', 'steadfast'];
export const MARK_INFO: Record<Mark, { name: string; desc: string }> = {
  burn: { name: 'เผาไหม้', desc: 'ทุกครั้งที่ใช้ ศัตรูติดไฟ 1/วิ นาน 3 วิ' },
  echo: { name: 'ตีซ้ำ', desc: 'ทำงานซ้ำอีกครั้งที่แรง 50%' },
  quick: { name: 'ร่ายไว', desc: 'คูลดาวน์ลด 40%' },
  steadfast: { name: 'ไม่หวั่นไหว', desc: 'คูลดาวน์ยังเดินต่อแม้โดนแช่แข็ง' },
};

export interface LogEntry {
  day: number;
  won: boolean;
  opp: string;
  ai: boolean;
  fightId?: string;
}

export interface RunState {
  v: 4;
  id: string;
  seed: number;
  hero: string;
  day: number;
  hp: number;
  wins: number;
  losses: number;
  gold: number;
  /** +n = n wins in a row, -n = n losses in a row */
  streak: number;
  lastIncome: { base: number; bonus: number };
  /** extra grid rows (เสบียงสุดท้าย) */
  bonusRows: number;
  /** extra grid columns bought in the shop */
  bonusCols: number;
  /** how many times grid space was bought (price goes up) */
  expands: number;
  /** placed blocks (x >= 0) and bag (x < 0) */
  skills: SkillInstance[];
  shop: (Offer | null)[];
  rolls: number;
  ghost: boolean;
  pendingMark: Mark | null;
  phase: 'shop' | 'lastchance' | 'mark' | 'won' | 'dead';
  rating: number;
  log: LogEntry[];
  /** the player gave up this run */
  conceded?: boolean;
}

/** Grid grows with the day: 5×3 on day 1 up to 7×5 (+ bonus rows). */
/** Grid grows with the day: 5×3 on day 1 up to 7×5, plus bought / bonus rows and columns (max 8×6). */
export function gridFor(day: number, bonusRows = 0, bonusCols = 0) {
  return {
    w: Math.min(MAX_W, Math.min(7, 5 + Math.floor((day - 1) / 4)) + bonusCols),
    h: Math.min(MAX_H, Math.min(5, 3 + Math.floor((day - 1) / 3)) + bonusRows),
  };
}
export const gridOf = (s: RunState) => gridFor(s.day, s.bonusRows, s.bonusCols ?? 0);

/** Price of the next grid expansion in the shop. */
export const expandPrice = (s: RunState) => 4 + 2 * (s.expands ?? 0);

/** What the next expansion adds: a column while the grid is not much wider than tall, else a row. null = grid is at max. */
export function nextExpand(s: RunState): 'col' | 'row' | null {
  const { w, h } = gridOf(s);
  if (w < MAX_W && (w - h < 2 || h >= MAX_H)) return 'col';
  if (h < MAX_H) return 'row';
  return null;
}

/** Buy +1 column or row of grid space. */
export function buyExpand(s: RunState): string | null {
  const what = nextExpand(s);
  if (!what) return 'ตารางใหญ่สุดแล้ว';
  const price = expandPrice(s);
  if (s.gold < price) return 'เงินไม่พอ';
  // grow by one step from the CURRENT size (bonus may have been capped by the day's base size)
  const before = gridOf(s);
  if (what === 'col') s.bonusCols = (s.bonusCols ?? 0) + 1;
  else s.bonusRows += 1;
  const after = gridOf(s);
  if (after.w === before.w && after.h === before.h) return 'ตารางใหญ่สุดแล้ว';
  s.gold -= price;
  s.expands = (s.expands ?? 0) + 1;
  return null;
}
export const bag = (s: RunState) => s.skills.filter((k) => k.x < 0);
export const priceOf = (id: string) => (SKILLS[id].hero ? UNIQUE_PRICE : PRICE);
export const damageFor = (day: number) => day;

/** Win streak bonus is clearly bigger than the loss-streak comeback money. */
export function incomeFor(day: number, streak: number) {
  const base = 5 + Math.min(Math.floor(day / 2), 3);
  const bonus = streak >= 5 ? 3 : streak >= 3 ? 2 : streak >= 2 ? 1 : streak <= -2 ? 1 : 0;
  return { base, bonus };
}

export function newRun(hero: string, seed: number, id: string): RunState {
  const s: RunState = {
    v: 4, id, seed, hero, day: 1, hp: START_HP, wins: 0, losses: 0, gold: 0, streak: 0,
    lastIncome: { base: 0, bonus: 0 }, bonusRows: 0, bonusCols: 0, expands: 0, skills: [], shop: [], rolls: 0,
    ghost: false, pendingMark: null, phase: 'shop', rating: 1000, log: [],
  };
  beginDay(s);
  return s;
}

export function beginDay(s: RunState) {
  const inc = incomeFor(s.day, s.streak);
  s.lastIncome = inc;
  s.gold += inc.base + inc.bonus;
  s.rolls = 0;
  rollShop(s);
  s.phase = 'shop';
}

function rollShop(s: RunState) {
  const rng = new Rng(hashSeed(s.seed, s.day, s.rolls));
  const pool = SKILL_LIST.filter((d) => !d.hero || d.hero === s.hero).map((d) => d.id);
  const picks: Offer[] = [];
  while (picks.length < SHOP_SIZE && pool.length) picks.push(rollOffer(rng, pool.splice(rng.int(pool.length), 1)[0], s.hero));
  s.shop = picks;
}

export function reroll(s: RunState): string | null {
  if (s.gold < REROLL) return 'เงินไม่พอ';
  s.gold -= REROLL;
  s.rolls++;
  rollShop(s);
  return null;
}

/** Buying a skill you own levels it up (keeps its shape, gains one new connect bonus). A new skill goes to the first free spot, or the bag. */
export function buy(s: RunState, i: number): string | null {
  const offer = s.shop[i];
  if (!offer) return 'ไม่มีของ';
  const price = priceOf(offer.id);
  if (s.gold < price) return 'เงินไม่พอ';
  const owned = s.skills.find((k) => k.id === offer.id);
  if (owned) {
    if (owned.lv >= MAX_LV) return 'เลเวลเต็มแล้ว';
    owned.lv++;
    if (owned.bonus.length < MAX_BONUS) {
      const b = rollBonus(new Rng(hashSeed(s.seed, s.day, s.rolls, 'lvl', i)), owned.id, s.hero, owned.bonus);
      if (b) owned.bonus.push(b);
    }
  } else {
    const { w, h } = gridOf(s);
    s.skills.push({ id: offer.id, lv: 1, shape: offer.shape, rot: 0, x: -1, y: -1, bonus: offer.bonus.map((b) => ({ ...b })) });
    const idx = s.skills.length - 1;
    const spot = findSpot(s.skills, w, h, idx);
    if (spot) Object.assign(s.skills[idx], spot);
    else if (bag(s).length > BAG_MAX) {
      s.skills.pop();
      return 'ไม่มีที่ว่าง ขายหรือจัดตารางก่อน';
    }
  }
  s.gold -= price;
  s.shop[i] = null;
  return null;
}

export function sell(s: RunState, i: number) {
  const k = s.skills[i];
  if (!k) return;
  s.gold += k.lv;
  s.skills.splice(i, 1);
}

/** Put block i at (x, y) with rotation rot. Returns an error if it does not fit. */
export function place(s: RunState, i: number, x: number, y: number, rot: Rot): string | null {
  const k = s.skills[i];
  if (!k) return 'ไม่มีของ';
  const { w, h } = gridOf(s);
  if (!fits(s.skills, w, h, i, x, y, rot)) return 'วางตรงนี้ไม่ได้';
  Object.assign(k, { x, y, rot });
  return null;
}

/** Take block i off the grid into the bag. */
export function unplace(s: RunState, i: number): string | null {
  const k = s.skills[i];
  if (!k) return 'ไม่มีของ';
  if (k.x >= 0 && bag(s).length >= BAG_MAX) return 'กระเป๋าเต็ม';
  Object.assign(k, { x: -1, y: -1 });
  return null;
}

/** Only placed blocks fight. */
export const toBuild = (s: RunState): Build => {
  const { w, h } = gridOf(s);
  return {
    hero: s.hero, w, h,
    skills: s.skills.filter((k) => k.x >= 0).map((k) => ({ ...k, bonus: k.bonus.map((b) => ({ ...b })) })),
  };
};

export function recordResult(s: RunState, won: boolean, info: Omit<LogEntry, 'day' | 'won'>) {
  s.log.push({ day: s.day, won, ...info });
  if (won) {
    s.wins++;
    s.streak = s.streak > 0 ? s.streak + 1 : 1;
  } else {
    s.losses++;
    s.hp -= damageFor(s.day);
    s.streak = s.streak < 0 ? s.streak - 1 : -1;
  }
  if (s.wins >= WIN_TARGET) {
    s.phase = 'won';
    return;
  }
  if (s.hp <= 0) {
    if (!s.ghost) {
      // โอกาสสุดท้าย: first death becomes a half-spirit with 1 HP
      s.ghost = true;
      s.hp = 1;
      s.phase = 'lastchance';
      return;
    }
    s.phase = 'dead';
    return;
  }
  s.day++;
  beginDay(s);
}

export function chooseLastChance(s: RunState, opt: LastChanceOption) {
  if (s.phase !== 'lastchance') return;
  if (opt === 'awaken') for (const k of s.skills) if (k.lv < AWAKEN_LV) k.lv = AWAKEN_LV;
  if (opt === 'supply') {
    s.gold += 8;
    s.bonusRows += 1;
  }
  if (opt === 'mark') {
    s.pendingMark = new Rng(hashSeed(s.seed, 'mark', s.day)).pick(MARKS);
    s.phase = 'mark';
    return;
  }
  s.day++;
  beginDay(s);
}

/** Give up the run: it ends right away as a loss. */
export function concede(s: RunState) {
  if (s.phase === 'won' || s.phase === 'dead') return;
  s.conceded = true;
  s.phase = 'dead';
}

/** idx = -1 skips placing the mark */
export function applyMark(s: RunState, idx: number) {
  if (s.phase !== 'mark' || !s.pendingMark) return;
  if (s.skills[idx]) s.skills[idx].mark = s.pendingMark;
  s.pendingMark = null;
  s.day++;
  beginDay(s);
}
