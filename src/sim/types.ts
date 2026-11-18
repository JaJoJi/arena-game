export type Archetype = 'tank' | 'burst' | 'scaling' | 'control';
export const ARCHES: Archetype[] = ['tank', 'burst', 'scaling', 'control'];

export type Mark = 'burn' | 'echo' | 'quick' | 'steadfast';

/** One equipped skill. Every skill runs its own cooldown in parallel; skills do not interact by position. */
export interface SkillInstance {
  id: string;
  /** tree variant: '' = Lv1, 'a' / 'b' = Lv2, 'a1' 'a2' 'b1' 'b2' = Lv3 (see skills.ts) */
  v: string;
  mark?: Mark;
}

/** A build is a hero plus its skill list (shown top to bottom; the order does not change the fight). */
export interface Build {
  hero: string;
  skills: SkillInstance[];
}

export type Side = 0 | 1;

export type StatusKind =
  | 'burn' // side = target
  | 'freeze' // side = target, value = ticks (0 = resisted)
  | 'slow' // side = target, value = percent
  | 'grow' // side = self, value = total growth
  | 'charge' // side = self, value = multiplier
  | 'thorns' // side = self, value = total thorns
  | 'steadfast' // side = self
  | 'rage' // side = self (hero passive)
  | 'amplify' // side = self
  | 'cleanse' // side = self, value = debuffs removed
  | 'dispel' // side = target, value = buffs removed
  | 'delay'; // side = target, value = cooldown ticks pushed back (0 = resisted)

/** Buffs and debuffs on one fighter right after an event (for the status UI). */
export interface Fx {
  /** growth (+damage per hit) */
  g: number;
  /** charge multiplier on the next hit (1 = none) */
  c: number;
  /** thorns */
  th: number;
  /** ใจเหล็ก */
  sf: 0 | 1;
  /** total burn per second */
  b: number;
  /** frozen ticks left */
  fr: number;
  /** slow percent (0 = not slowed) and ticks left */
  sl: number;
  slt: number;
}

/** Per-block stats for the post-fight breakdown. Index = build.skills index. */
export interface BlockStat {
  /** fires */
  c: number;
  /** damage dealt (including what shields blocked) */
  d: number;
  /** damage that this block's buffs (พลังโจมตี stacks, รวมพลัง) added to hits of ANY block */
  bf: number;
  /** HP healed */
  h: number;
  /** shield gained */
  sh: number;
  /** control ticks applied to the enemy (freeze + cooldown delay) */
  fz: number;
}

export interface Snap {
  hp: [number, number];
  sh: [number, number];
  fx: [Fx, Fx];
}

export type EventBody =
  /** idx = index into that side's build.skills */
  | { type: 'cast'; side: Side; skill: string; lv: number; idx: number; echo?: boolean }
  | { type: 'damage'; side: Side; amount: number; blocked: number; src: string }
  | { type: 'shield'; side: Side; amount: number }
  | { type: 'heal'; side: Side; amount: number }
  | { type: 'status'; side: Side; status: StatusKind; value: number }
  | { type: 'fatigue'; amount: number }
  | { type: 'end'; winner: Side | -1 };

/** t = tick (10 ticks per second). s = HP/shield snapshot AFTER the event. */
export type CombatEvent = EventBody & { t: number; s: Snap };

export interface CombatResult {
  v: number;
  seed: number;
  day: number;
  winner: Side | -1;
  ticks: number;
  maxHp: [number, number];
  init: Snap;
  events: CombatEvent[];
  stats: [BlockStat[], BlockStat[]];
  /** only when simulate(..., { trace: true }): per tick cooldown progress, see CooldownTrace */
  trace?: CooldownTrace;
}

/**
 * Cooldown progress of every skill at every tick, for the replay's clock-wipe.
 * p[side][tick * n[side] + idx] = progress 0..255 (255 = ready), idx = build.skills index.
 * Not sent by the server: the browser re-runs the deterministic fight locally to get it.
 */
export interface CooldownTrace {
  n: [number, number];
  p: [Uint8Array, Uint8Array];
  /** frozen flag per tick per side (1 = frozen) */
  fr: [Uint8Array, Uint8Array];
}
