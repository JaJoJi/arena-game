import type { Archetype, StatusKind } from './types';

/** What a hook can see and do to its own fighter. Implemented by combat.ts. */
export interface HookFighter {
  readonly hero: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
  /** the enemy is slowed / frozen right now */
  readonly foeSlowed: boolean;
  readonly foeFrozen: boolean;
  /** per-fight scratch values for hooks (e.g. "already raged") */
  flags: Record<string, number>;
  grow(n: number): void;
  /** add thorns; permanent = never wears off */
  thorns(n: number, permanent?: boolean): void;
  addShield(n: number): void;
  status(kind: StatusKind, value: number): void;
}

/**
 * Combat hooks. Hero passives use them now; daily rules (Phase 3) will use the same interface.
 * Modifier hooks get the current value and return the new one.
 */
export interface CombatHooks {
  maxHp?(hp: number): number;
  startShield?(n: number, maxHp: number): number;
  onStart?(me: HookFighter): void;
  onDamaged?(me: HookFighter, amount: number, src: string): void;
  /** multiplier given by a charge skill this fighter casts */
  chargeMult?(m: number): number;
  /** freeze ticks this fighter applies to the enemy, before diminishing returns */
  freezeTicks?(ticks: number): number;
  /** thorns damage reflected when this fighter is hit: capped value, total thorns, size of the hit */
  thornsReflect?(capped: number, total: number, hit: number): number;
  /** thorns this fighter gains never wear off */
  thornsPermanent?: boolean;
  /** damage of each hit this fighter deals (after growth and charge) */
  onHit?(me: HookFighter, dmg: number): number;
  /** seconds a burn this fighter applies lasts */
  burnSecs?(secs: number): number;
  /** slow this fighter applies: [percent 0..1, seconds] */
  slow?(pct: number, secs: number): [number, number];
}

export interface HeroDef {
  id: string;
  name: string;
  arch: Archetype;
  passive: string;
  unique: string;
  /** how this hero plays, for หอฮีโร่ and the hero pick */
  style: string;
  hooks: CombatHooks;
  /** skills the bot likes for this hero (on top of its archetype) */
  botWant?: string[];
}

export const HEROES: HeroDef[] = [
  // ---------------- tank ----------------
  {
    id: 'knight', name: 'อัศวิน', arch: 'tank', unique: 'bulwark',
    passive: 'เลือดสูงสุด +6% และเริ่มสู้พร้อมโล่ 12% ของเลือด',
    style: 'กำแพงโล่: สะสมโล่ให้หนา แล้วใช้โล่กระแทกตีกลับแรงตามโล่ที่มี',
    hooks: { maxHp: (hp) => Math.round(hp * 1.06), startShield: (n, max) => n + Math.round(max * 0.12) },
  },
  {
    id: 'thornguard', name: 'นักรบหนาม', arch: 'tank', unique: 'spikewall',
    passive: 'หนามของคุณไม่หายไปจนจบการสู้ และสะท้อนได้ถึง 100% ของดาเมจที่โดน (ปกติ 75%) · เริ่มสู้พร้อมหนาม 2',
    style: 'ยิ่งโดนตียิ่งเจ็บ: สะสมหนาม ให้ศัตรูที่ตีถี่ๆ ทำร้ายตัวเอง แล้วปิดด้วยป้อมหนาม',
    hooks: {
      onStart(me) {
        me.thorns(2, true);
      },
      thornsReflect: (_capped, total, hit) => Math.min(total, hit),
      thornsPermanent: true,
    },
    botWant: ['thorns', 'spikewall', 'shield'],
  },
  // ---------------- burst ----------------
  {
    id: 'assassin', name: 'นักฆ่า', arch: 'burst', unique: 'execute',
    passive: 'skill รวมพลังของคุณให้ตัวคูณเพิ่มอีก +0.25',
    style: 'ตีทีเดียวจบ: รวมพลังแล้วปล่อยการโจมตีหนักๆ ปลิดชีพตอนศัตรูเลือดต่ำ',
    hooks: { chargeMult: (m) => m + 0.25 },
  },
  {
    id: 'duelist', name: 'นักดาบคู่', arch: 'burst', unique: 'flurry',
    passive: 'การโจมตีทุกครั้งที่ 3 ของคุณแรง x1.4',
    style: 'ตีรัวไม่หยุด: skill คูลดาวน์สั้นและตีหลายครั้ง ยิ่งตีถี่ยิ่งได้ครั้งที่ 3 บ่อย',
    hooks: {
      onHit(me, dmg) {
        me.flags.hits = (me.flags.hits ?? 0) + 1;
        return me.flags.hits % 3 === 0 ? dmg * 1.4 : dmg;
      },
    },
    botWant: ['jab', 'flurry', 'strike'],
  },
  // ---------------- scaling ----------------
  {
    id: 'berserker', name: 'นักรบคลั่ง', arch: 'scaling', unique: 'rampage',
    passive: 'เริ่มสู้ด้วยพลังโจมตี +2 · ครั้งแรกที่เลือดต่ำกว่าครึ่ง ได้พลังโจมตีอีก +2 (ทุกการโจมตีของทุก skill จนจบการสู้)',
    style: 'โตไม่หยุด: สะสมพลังโจมตีทีละนิด ยิ่งสู้นานยิ่งตีแรง',
    hooks: {
      onStart(me) {
        me.grow(2);
      },
      onDamaged(me) {
        if (!me.flags.raged && me.hp > 0 && me.hp < me.maxHp / 2) {
          me.flags.raged = 1;
          me.grow(2);
          me.status('rage', 2);
        }
      },
    },
  },
  {
    id: 'pyro', name: 'นักเวทเพลิง', arch: 'scaling', unique: 'inferno',
    passive: 'ไฟที่คุณจุดติดนานขึ้น 2 วิ',
    style: 'ไฟซ้อนไฟ: จุดไฟหลายกองให้ซ้อนกัน แล้วระเบิดเพลิงตามไฟที่ยังเหลือ (ไม่สนโล่)',
    hooks: { burnSecs: (s) => s + 2 },
    botWant: ['ignite', 'inferno', 'amplify'],
  },
  // ---------------- control ----------------
  {
    id: 'witch', name: 'แม่มดน้ำแข็ง', arch: 'control', unique: 'shatter',
    passive: 'การแช่แข็งที่คุณใส่ศัตรูนานขึ้น 0.3 วิ',
    style: 'หยุดเวลา: แช่แข็งศัตรูแล้วทุบน้ำแข็งแรง x3 ระหว่างที่ศัตรูขยับไม่ได้',
    hooks: { freezeTicks: (t) => t + 3 },
  },
  {
    id: 'chrono', name: 'จอมเวทเวลา', arch: 'control', unique: 'timewarp',
    passive: 'ความช้าที่คุณใส่แรงขึ้น +10% และนานขึ้น 1 วิ · ตีศัตรูที่ช้าอยู่แรงขึ้น 30%',
    style: 'ถ่วงเวลา: ทำให้ศัตรูช้าและดึงคูลดาวน์ถอยหลัง skill ศัตรูแทบไม่ได้ออก',
    hooks: {
      slow: (p, s) => [p + 0.1, s + 1],
      onHit: (me, dmg) => (me.foeSlowed ? dmg * 1.3 : dmg),
    },
    botWant: ['chill', 'timewarp', 'dispel'],
  },
];

export const HEROES_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));
