import type { Archetype, StatusKind } from './types';

/** What a hook can see and do to its own fighter. Implemented by combat.ts. */
export interface HookFighter {
  readonly hero: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly shield: number;
  /** per-fight scratch values for hooks (e.g. "already raged") */
  flags: Record<string, number>;
  grow(n: number): void;
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
}

export interface HeroDef {
  id: string;
  name: string;
  arch: Archetype;
  passive: string;
  unique: string;
  hooks: CombatHooks;
}

export const HEROES: HeroDef[] = [
  {
    id: 'knight', name: 'อัศวิน', arch: 'tank', unique: 'bulwark',
    passive: 'เลือดสูงสุด +10% และเริ่มสู้พร้อมโล่ 10% ของเลือด',
    hooks: { maxHp: (hp) => Math.round(hp * 1.1), startShield: (n, max) => n + Math.round(max * 0.1) },
  },
  {
    id: 'assassin', name: 'นักฆ่า', arch: 'burst', unique: 'execute',
    passive: 'skill รวมพลังของคุณให้ตัวคูณเพิ่มอีก +0.25',
    hooks: { chargeMult: (m) => m + 0.25 },
  },
  {
    id: 'berserker', name: 'นักรบคลั่ง', arch: 'scaling', unique: 'rampage',
    passive: 'ครั้งแรกที่เลือดต่ำกว่าครึ่ง ได้พลังโจมตี +3 จนจบการสู้ (ทุกการโจมตีของทุก skill)',
    hooks: {
      onDamaged(me) {
        if (!me.flags.raged && me.hp > 0 && me.hp < me.maxHp / 2) {
          me.flags.raged = 1;
          me.grow(3);
          me.status('rage', 3);
        }
      },
    },
  },
  {
    id: 'witch', name: 'แม่มดน้ำแข็ง', arch: 'control', unique: 'shatter',
    passive: 'การแช่แข็งที่คุณใส่ศัตรูนานขึ้น 0.3 วิ',
    hooks: { freezeTicks: (t) => t + 3 },
  },
];

export const HEROES_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));
