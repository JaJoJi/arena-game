import type { Archetype } from './types';

export interface FighterView {
  hp: number;
  maxHp: number;
  shield: number;
  frozen: boolean;
  hero: string;
  /** total thorns right now */
  thorns: number;
  /** burn damage still to come from every burn stack on this fighter */
  burnLeft: number;
}

/** What a skill can do. Implemented by the combat engine. */
export interface Ctx {
  lv: number;
  /** Scale a base number by level and combo power. */
  v(base: number): number;
  /** Like v, but levels add only +25% each (for stacking buffs, which already grow over the fight). */
  vf(base: number): number;
  /** Like v, but levels add +70% each (burst hits). */
  vs(base: number): number;
  readonly me: FighterView;
  readonly foe: FighterView;
  /** pierce = ignores shield (true) or ignores this share of it (0..1) */
  hit(amount: number, pierce?: boolean | number): void;
  shield(n: number): void;
  heal(n: number): void;
  burn(dps: number, secs: number): void;
  freeze(secs: number): void;
  slow(pct: number, secs: number): void;
  /** push every enemy cooldown back (cast delay); diminishing like freeze, shares the control cap */
  delay(secs: number): void;
  grow(n: number): void;
  charge(mult: number): void;
  thorns(n: number): void;
  steadfast(): void;
  /** double own buffs (growth, thorns, charge); each grows by at most `cap` */
  /** returns how much was added (0 = there was nothing to double) */
  amplify(cap: number): number;
  /** remove one of each debuff on self: one burn stack, slow, freeze */
  cleanse(): void;
  /** remove one of each buff on the enemy: one growth stack, one thorns stack, charge, steadfast */
  dispel(): void;
}

export interface SkillDef {
  id: string;
  name: string;
  arch: Archetype | 'none';
  /** cooldown in ticks (10 ticks = 1s). All blocks count down at the same time. */
  cd: number;
  /** shapes a copy can roll in the shop */
  shapes: string[];
  /** deals direct hits (can roll the +damage connect bonus) */
  hits?: boolean;
  /** setup skills go early in the order (used by bots) */
  setup?: boolean;
  /**
   * Engine skills fire other blocks they touch (combat.ts):
   * gear = one touching block per fire, round-robin, its cooldown keeps running
   * overclock = every touching block fires now and its cooldown restarts
   */
  engine?: 'gear' | 'overclock';
  /** hero-unique skill: only that hero's shop offers it */
  hero?: string;
  desc(lv: number): string;
  run(c: Ctx): void;
}

export const lvScale = (lv: number) => 1 + 0.5 * (lv - 1);
export const sv = (base: number, lv: number) => Math.max(1, Math.round(base * lvScale(lv)));
export const flatScale = (lv: number) => 1 + 0.25 * (lv - 1);
/** burst hits get more from levels than other skills: their only job is damage */
export const steepScale = (lv: number) => 1 + 0.7 * (lv - 1);
export const svs = (base: number, lv: number) => Math.max(1, Math.round(base * steepScale(lv)));
export const svf = (base: number, lv: number) => Math.max(1, Math.round(base * flatScale(lv)));
const chargeMult = (lv: number) => +(1.7 + 0.3 * (lv - 1)).toFixed(2);
const freezeSecs = (lv: number) => +(1.4 + 0.3 * (lv - 1)).toFixed(1);
const slowSecs = (lv: number) => 3 + 0.5 * (lv - 1);
export const gearPower = (lv: number) => +(0.3 + 0.05 * (lv - 1)).toFixed(2);
export const overclockPower = (lv: number) => +(0.8 + 0.15 * (lv - 1)).toFixed(2);

export const ARCH_NAME: Record<Archetype | 'none', string> = {
  tank: 'ถึก',
  burst: 'ดาเมจ',
  scaling: 'โตไม่หยุด',
  control: 'ควบคุม',
  none: 'ทั่วไป',
};

export const SKILL_LIST: SkillDef[] = [
  // --- burst ---
  { id: 'strike', hits: true, name: 'ฟัน', arch: 'burst', cd: 40, shapes: ['i3', 'l3'], desc: (lv) => `โจมตีศัตรู ${svs(4, lv)} (+พลังโจมตีที่คุณสะสม)`, run: (c) => c.hit(c.vs(4)) },
  { id: 'jab', hits: true, name: 'แทงเร็ว', arch: 'burst', cd: 30, shapes: ['i2'], desc: (lv) => `โจมตีศัตรู ${svs(3, lv)} (+พลังโจมตี) · คูลดาวน์สั้น ใช้บ่อย`, run: (c) => c.hit(c.vs(3)) },
  { id: 'heavy', hits: true, name: 'ทุบหนัก', arch: 'burst', cd: 75, shapes: ['r6', 'p5'], desc: (lv) => `โจมตีหนัก ${svs(10, lv)} (+พลังโจมตี) · ทะลุโล่ครึ่งหนึ่ง · คูลดาวน์ยาว`, run: (c) => c.hit(c.vs(10), 0.5) },
  {
    id: 'charge', name: 'รวมพลัง', arch: 'burst', cd: 50, shapes: ['i2', 'l3'], setup: true,
    desc: (lv) => `รวมพลัง x${chargeMult(lv)}: การโจมตีครั้งถัดไปของคุณ (skill ไหนก็ได้ 1 ครั้ง) แรงขึ้น x${chargeMult(lv)}`,
    run: (c) => c.charge(chargeMult(c.lv)),
  },
  // --- tank ---
  { id: 'shield', name: 'ยกโล่', arch: 'tank', cd: 60, shapes: ['o4', 'l3'], setup: true, desc: (lv) => `ได้โล่ ${sv(10, lv)}: โล่รับดาเมจแทนเลือด อยู่จนกว่าจะแตก`, run: (c) => c.shield(c.v(10)) },
  {
    id: 'thorns', name: 'เกราะหนาม', arch: 'tank', cd: 70, shapes: ['i3', 'l3'], setup: true,
    desc: (lv) => `หนาม +${svf(2, lv)} นาน 10 วิ (ซ้อนกันได้): ทุกครั้งที่ศัตรูตีคุณ สะท้อนดาเมจเท่าหนามที่มี (ไม่เกิน 75% ของดาเมจที่โดน) · ระหว่างที่มีหนาม ศัตรูฟื้นเลือดได้แค่ครึ่งเดียว`,
    run: (c) => c.thorns(c.vf(2)),
  },
  {
    id: 'stoneskin', name: 'ผิวหิน', arch: 'tank', cd: 70, shapes: ['t4', 'l4'],
    desc: (lv) => `ได้โล่ ${sv(5, lv)} และฟื้นเลือดตัวเอง ${sv(5, lv)}`,
    run: (c) => { c.shield(c.v(5)); c.heal(c.v(5)); },
  },
  // --- scaling ---
  {
    id: 'train', hits: true, name: 'ฝึกฝน', arch: 'scaling', cd: 62, shapes: ['i2', 'l3'], setup: true,
    desc: (lv) => `พลังโจมตี +${svf(2, lv)} จนจบการสู้ (สะสม): ทุกการโจมตีของทุก skill ของคุณทำดาเมจเพิ่มเท่านี้ · แล้วโจมตี ${sv(1, lv)}`,
    run: (c) => { c.grow(c.vf(2)); c.hit(c.v(1)); },
  },
  {
    id: 'ignite', name: 'จุดไฟ', arch: 'scaling', cd: 55, shapes: ['i3', 'i2'],
    desc: (lv) => `ศัตรูติดไฟ ${svf(2, lv)}/วิ นาน 6 วิ · ไม่สนโล่ · หลายกองซ้อนกันได้`,
    run: (c) => c.burn(c.vf(2), 6),
  },
  {
    id: 'feast', name: 'กินฟื้นแรง', arch: 'scaling', cd: 55, shapes: ['o4', 's4'],
    desc: (lv) => `ฟื้นเลือดตัวเอง ${sv(7, lv)} และพลังโจมตี +1 จนจบการสู้ (ทุกการโจมตีของทุก skill)`,
    run: (c) => { c.heal(c.v(7)); c.grow(1); },
  },
  // --- control ---
  {
    id: 'frost', hits: true, name: 'ลูกน้ำแข็ง', arch: 'control', cd: 50, shapes: ['i2', 'l3'],
    desc: (lv) => `โจมตี ${svs(4, lv)} และแช่แข็งศัตรู ${freezeSecs(lv)} วิ: skill ทุกตัวของศัตรูหยุดนับคูลดาวน์ · โดนถี่ๆ ผลลดลง`,
    run: (c) => { c.hit(c.vs(4)); c.freeze(freezeSecs(c.lv)); },
  },
  {
    id: 'chill', name: 'ลมหนาว', arch: 'control', cd: 70, shapes: ['i3', 'l3'], setup: true,
    desc: (lv) => `ศัตรูช้าลง 30% นาน ${slowSecs(lv)} วิ: คูลดาวน์ของ skill ทุกตัวของศัตรูเดินช้าลง`,
    run: (c) => c.slow(0.3, slowSecs(c.lv)),
  },
  // --- anti-control ---
  {
    id: 'ironwill', name: 'ใจเหล็ก', arch: 'none', cd: 80, shapes: ['dot', 'i2'], setup: true,
    desc: (lv) => `ใจเหล็ก จนจบการสู้: แช่แข็งและความช้าที่คุณโดนลดลง 60% · ได้โล่ ${sv(2, lv)}`,
    run: (c) => { c.steadfast(); c.shield(c.v(2)); },
  },
  // --- buff / debuff control ---
  {
    id: 'amplify', name: 'ขยายพลัง', arch: 'scaling', cd: 72, shapes: ['t4', 'l4'],
    desc: (lv) => `บัฟที่คุณมีตอนนี้เพิ่มเป็น 2 เท่า: พลังโจมตี หนาม รวมพลัง (เพิ่มได้สูงสุด ${2 + 2 * lv} ต่ออย่าง) · ถ้ายังไม่มีบัฟเลย ได้พลังโจมตี +${sv(2, lv)} แทน`,
    run: (c) => { if (c.amplify(2 + 2 * c.lv) === 0) c.grow(c.v(2)); },
  },
  {
    id: 'cleanse', name: 'ชำระล้าง', arch: 'tank', cd: 60, shapes: ['i2', 'l3'],
    desc: (lv) => `ลบดีบัฟบนตัวคุณ: ไฟ 2 กองที่แรงสุด ความช้า การแช่แข็ง · ได้โล่ ${sv(3, lv)}`,
    run: (c) => { c.cleanse(); c.shield(c.v(3)); },
  },
  {
    id: 'dispel', name: 'สลายเวท', arch: 'control', cd: 60, hits: true, shapes: ['i3', 'l3'],
    desc: (lv) => `ลบบัฟของศัตรูอย่างละ 1: พลังโจมตีกองล่าสุด หนามกองล่าสุด รวมพลัง ใจเหล็ก และโล่ 30% · โจมตี ${sv(3, lv)}`,
    run: (c) => { c.dispel(); c.hit(c.v(3)); },
  },
  // --- engines ---
  {
    id: 'gear', name: 'ฟันเฟือง', arch: 'none', cd: 15, engine: 'gear', shapes: ['o4', 'r6'],
    desc: (lv) => `ทุก 1.5 วิ สั่ง skill ที่ติดกับฟันเฟือง 1 ตัวทำงานทันที (วนทีละตัว) ที่แรง ${Math.round(gearPower(lv) * 100)}% · คูลดาวน์ของตัวนั้นเดินต่อตามปกติ`,
    run: () => {},
  },
  {
    id: 'overclock', name: 'เร่งเครื่อง', arch: 'none', cd: 50, engine: 'overclock', shapes: ['i2', 'l3'],
    desc: (lv) => `สั่ง skill ทุกตัวที่ติดกับเร่งเครื่องทำงานทันที ที่แรง ${Math.round(overclockPower(lv) * 100)}% · แล้วคูลดาวน์ของตัวนั้นเริ่มนับใหม่จาก 0`,
    run: () => {},
  },
  // --- hero uniques ---
  {
    id: 'bulwark', hits: true, hero: 'knight', name: 'โล่กระแทก', arch: 'tank', cd: 60, shapes: ['l4', 't4'],
    desc: (lv) => `โจมตี ${sv(3, lv)} + 70% ของโล่ที่คุณมีตอนนั้น (+พลังโจมตี)`,
    run: (c) => c.hit(c.v(3) + Math.floor(c.me.shield * 0.7)),
  },
  {
    id: 'execute', hits: true, hero: 'assassin', name: 'ปลิดชีพ', arch: 'burst', cd: 50, shapes: ['i3', 'l3'],
    desc: (lv) => `โจมตี ${svs(6, lv)} (+พลังโจมตี) · ถ้าศัตรูเลือดต่ำกว่า 50% แรง x1.6`,
    run: (c) => c.hit(Math.round(c.vs(6) * (c.foe.hp < c.foe.maxHp * 0.5 ? 1.6 : 1))),
  },
  {
    id: 'rampage', hits: true, hero: 'berserker', name: 'คลั่ง', arch: 'scaling', cd: 62, shapes: ['t4', 's4'],
    desc: (lv) => `โจมตี ${sv(1.5, lv)} สองครั้งติด · พลังโจมตีบวกให้ทุกครั้ง (ยิ่งพลังสูงยิ่งแรง)`,
    run: (c) => { for (let i = 0; i < 2; i++) c.hit(c.v(1.5)); },
  },
  {
    id: 'shatter', hits: true, hero: 'witch', name: 'ทุบน้ำแข็ง', arch: 'control', cd: 45, shapes: ['i3', 'l4'],
    desc: (lv) => `โจมตี ${sv(5, lv)} ไม่สนโล่ · ถ้าศัตรูกำลังถูกแช่แข็ง แรง x3`,
    run: (c) => c.hit(c.v(5) * (c.foe.frozen ? 3 : 1), true),
  },
  {
    id: 'spikewall', hits: true, hero: 'thornguard', name: 'ป้อมหนาม', arch: 'tank', cd: 55, shapes: ['t4', 'l4'],
    desc: (lv) => `โจมตี ${sv(3, lv)} + หนามที่คุณมีตอนนั้น x2.5 (+พลังโจมตี)`,
    run: (c) => c.hit(c.v(3) + Math.round(c.me.thorns * 2.5)),
  },
  {
    id: 'flurry', hits: true, hero: 'duelist', name: 'พายุดาบ', arch: 'burst', cd: 50, shapes: ['i3', 'l3'],
    desc: (lv) => `โจมตี ${svs(1, lv)} สี่ครั้งติด (+พลังโจมตีทุกครั้ง)`,
    run: (c) => { for (let i = 0; i < 4; i++) c.hit(c.vs(1)); },
  },
  {
    id: 'inferno', hits: true, hero: 'pyro', name: 'ระเบิดเพลิง', arch: 'scaling', cd: 60, shapes: ['o4', 't4'],
    desc: (lv) => `โจมตี ${sv(2, lv)} + 70% ของดาเมจไฟที่ยังเหลือบนตัวศัตรู · ไม่สนโล่ · ไฟไม่หายไป`,
    run: (c) => c.hit(c.v(2) + Math.floor(c.foe.burnLeft * 0.7), true),
  },
  {
    id: 'timewarp', hits: true, hero: 'chrono', name: 'บิดเวลา', arch: 'control', cd: 50, shapes: ['i3', 'l3'],
    desc: (lv) => `โจมตี ${sv(3, lv)} และดึงคูลดาวน์ skill ทุกตัวของศัตรูถอยหลัง ${(1.5 + 0.25 * (lv - 1)).toFixed(2)} วิ · โดนถี่ๆ ผลลดลง`,
    run: (c) => { c.hit(c.v(3)); c.delay(1.5 + 0.25 * (c.lv - 1)); },
  },
];

export const SKILLS: Record<string, SkillDef> = Object.fromEntries(SKILL_LIST.map((s) => [s.id, s]));
