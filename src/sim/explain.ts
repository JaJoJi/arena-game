import { TPS, fatigueStart } from './combat';
import { SKILLS } from './skills';
import type { Build, CombatResult, Side } from './types';

/**
 * Post-fight explanation in Thai, from the events and per-block stats of one fight.
 * Pure (no DOM): the result screen and replays show it, and scripts can test it.
 */
export interface Explanation {
  /** one line: who won, how and when */
  headline: string;
  /** short facts: top damage, chains, control, biggest hit */
  facts: string[];
  /** why `me` lost (or won), most important first, each with what to try */
  reasons: string[];
}

interface SideTotals {
  /** damage dealt to the enemy incl. what shields blocked, by source */
  dealt: number;
  /** damage the enemy's shields blocked */
  blockedByFoe: number;
  /** damage taken from the enemy's thorns / burn / fatigue */
  thornsTaken: number;
  burnTaken: number;
  fatigueTaken: number;
  healed: number;
  shielded: number;
  /** biggest single hit dealt */
  bigHit: number;
  bigHitSrc: string;
  chains: number;
  longestChain: number;
  /** growth reached (พลังโจมตี) */
  growth: number;
}

const sec = (ticks: number) => (ticks / TPS).toFixed(1);
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const skillName = (id: string) => (id === 'thorns' ? 'หนาม' : id === 'burn' ? 'ไฟ' : id === 'fatigue' ? 'ความเหนื่อยล้า' : SKILLS[id]?.name ?? id);

function totals(r: CombatResult): [SideTotals, SideTotals] {
  const t = [0, 1].map(() => ({
    dealt: 0, blockedByFoe: 0, thornsTaken: 0, burnTaken: 0, fatigueTaken: 0, healed: 0, shielded: 0,
    bigHit: 0, bigHitSrc: '', chains: 0, longestChain: 0, growth: 0,
  })) as [SideTotals, SideTotals];
  for (const e of r.events) {
    if (e.type === 'damage') {
      const victim = t[e.side];
      const attacker = t[1 - e.side];
      if (e.src === 'fatigue') victim.fatigueTaken += e.amount;
      else if (e.src === 'thorns') victim.thornsTaken += e.amount + e.blocked;
      else if (e.src === 'burn') victim.burnTaken += e.amount;
      if (e.src !== 'fatigue') {
        attacker.dealt += e.amount + e.blocked;
        attacker.blockedByFoe += e.blocked;
        if (e.src !== 'burn' && e.src !== 'thorns' && e.amount + e.blocked > attacker.bigHit) {
          attacker.bigHit = e.amount + e.blocked;
          attacker.bigHitSrc = e.src;
        }
      }
    } else if (e.type === 'heal') t[e.side].healed += e.amount;
    else if (e.type === 'shield') t[e.side].shielded += e.amount;
    else if (e.type === 'cast' && e.chain > 0 && !e.echo) {
      t[e.side].chains++;
      t[e.side].longestChain = Math.max(t[e.side].longestChain, e.chain + 1);
    }
  }
  const last = r.events.at(-1);
  if (last) for (const s of [0, 1] as Side[]) t[s].growth = last.s.fx[s].g;
  return t;
}

/** Top damage block of one side: [skill id, damage incl. buff credit, share of that side's damage]. */
function topBlock(r: CombatResult, b: Build, s: Side): [string, number, number] | null {
  const st = r.stats[s];
  let best = -1;
  let total = 0;
  st.forEach((x, i) => {
    total += x.d;
    if (best < 0 || x.d > st[best].d) best = i;
  });
  if (best < 0 || st[best].d <= 0) return null;
  return [b.skills[best].id, st[best].d, pct(st[best].d, total)];
}

/**
 * Explain a fight from the point of view of side `me`.
 * builds = [left, right] as passed to simulate(); names = display names.
 */
export function explain(r: CombatResult, builds: [Build, Build], me: Side = 0, names: [string, string] = ['คุณ', 'ศัตรู']): Explanation {
  const foe = (1 - me) as Side;
  const T = totals(r);
  const my = T[me];
  const their = T[foe];
  const won = r.winner === me;
  const draw = r.winner === -1;
  const fStart = fatigueStart(r.day);
  const fatigued = r.ticks >= fStart;
  const len = r.ticks;

  // ---------- headline ----------
  let how: string;
  if (draw) how = 'เสมอ';
  else if (r.ticks >= 90 * TPS) how = `${won ? 'ชนะ' : 'แพ้'}เพราะหมดเวลา (เทียบเลือดที่เหลือเป็น %)`;
  else if (fatigued) how = `${won ? 'ชนะ' : 'แพ้'}ช่วงเหนื่อยล้า (หลัง ${sec(fStart)} วิ ทั้งสองฝ่ายเสียเลือดเพิ่มทุกวินาที)`;
  else how = won ? 'ชนะน็อก' : 'แพ้น็อก';
  const headline = `${how} · ${sec(len)} วิ · เลือดเหลือ ${Math.max(0, r.events.at(-1)?.s.hp[me] ?? 0)}/${r.maxHp[me]} ต่อ ${Math.max(0, r.events.at(-1)?.s.hp[foe] ?? 0)}/${r.maxHp[foe]}`;

  // ---------- facts ----------
  const facts: string[] = [];
  const mt = topBlock(r, builds[me], me);
  const ft = topBlock(r, builds[foe], foe);
  facts.push(`ดาเมจรวม: ${names[me]} ${my.dealt} · ${names[foe]} ${their.dealt}`);
  if (mt) facts.push(`skill ที่ทำดาเมจมากสุดของ${names[me]}: ${skillName(mt[0])} ${mt[1]} (${mt[2]}%)`);
  if (ft) facts.push(`skill ที่ทำดาเมจมากสุดของ${names[foe]}: ${skillName(ft[0])} ${ft[1]} (${ft[2]}%)`);
  if (my.chains || their.chains)
    facts.push(`เชน: ${names[me]} ${my.chains} ครั้ง (ยาวสุด x${my.longestChain || 1}) · ${names[foe]} ${their.chains} ครั้ง (ยาวสุด x${their.longestChain || 1})`);
  const myCtl = r.stats[foe].reduce((n, x) => n + x.fz, 0); // control applied TO me
  const theirCtl = r.stats[me].reduce((n, x) => n + x.fz, 0);
  if (myCtl || theirCtl) facts.push(`โดนควบคุม (แช่แข็ง/ถ่วงเวลา): ${names[me]} ${sec(myCtl)} วิ · ${names[foe]} ${sec(theirCtl)} วิ`);
  if (my.bigHit || their.bigHit)
    facts.push(`ตีแรงสุด: ${names[me]} ${my.bigHit}${my.bigHitSrc ? ` (${skillName(my.bigHitSrc)})` : ''} · ${names[foe]} ${their.bigHit}${their.bigHitSrc ? ` (${skillName(their.bigHitSrc)})` : ''}`);

  // ---------- reasons (scored, highest first) ----------
  const out: [number, string][] = [];
  const add = (score: number, text: string) => score > 0 && out.push([score, text]);
  const myPlaced = builds[me].skills.filter((k) => k.x >= 0);
  if (!won) {
    const lostHp = r.maxHp[me];
    if (pct(myCtl, len) >= 20)
      add(pct(myCtl, len), `คุณโดนแช่แข็ง/ถ่วงเวลา ${sec(myCtl)} วิ (${pct(myCtl, len)}% ของการสู้) skill ของคุณแทบไม่ได้ออก → ลอง ใจเหล็ก (ลดการควบคุม 60%) หรือ ชำระล้าง (ลบการแช่แข็ง)`);
    if (pct(my.blockedByFoe, my.dealt) >= 30)
      add(pct(my.blockedByFoe, my.dealt), `โล่ของศัตรูกันดาเมจคุณไป ${my.blockedByFoe} (${pct(my.blockedByFoe, my.dealt)}%) → ทุบหนัก (ทะลุโล่ครึ่งหนึ่ง), จุดไฟ (ไม่สนโล่) หรือ สลายเวท (ลบโล่ 30%)`);
    if (pct(my.thornsTaken, lostHp) >= 15)
      add(pct(my.thornsTaken, lostHp), `หนามของศัตรูสะท้อนใส่คุณ ${my.thornsTaken} → ตีน้อยครั้งแต่แรง (ทุบหนัก) แทนการตีรัว หรือ สลายเวท ลบหนาม`);
    if (pct(their.healed, my.dealt) >= 20)
      add(pct(their.healed, my.dealt), `ศัตรูฟื้นเลือด ${their.healed} (${pct(their.healed, my.dealt)}% ของดาเมจคุณ) → เกราะหนาม (ระหว่างมีหนาม ศัตรูฟื้นได้ครึ่งเดียว) หรือเร่งดาเมจให้จบเร็ว`);
    if (pct(my.burnTaken, lostHp) >= 25)
      add(pct(my.burnTaken, lostHp), `ไฟทำดาเมจคุณ ${my.burnTaken} (ไม่สนโล่) → ชำระล้าง ลบไฟ 2 กองที่แรงสุด`);
    if (their.growth >= 8 && their.growth > my.growth * 2)
      add(their.growth * 3, `ศัตรูสะสมพลังโจมตีได้ถึง +${their.growth} ต่อการตี (ของคุณ +${my.growth}) ยิ่งนานยิ่งแรง → สลายเวท ลบพลังโจมตี หรือทำดาเมจให้จบก่อนศัตรูโต`);
    if (fatigued && my.dealt < their.dealt)
      add(30, `สู้กันยืดเยื้อจนเหนื่อยล้า ศัตรูทำดาเมจได้มากกว่า (${their.dealt} ต่อ ${my.dealt}) → เพิ่ม skill ที่ตีได้ หรือเลเวลอัป skill หลัก`);
    if (their.longestChain >= 3 && their.chains > my.chains * 2)
      add(their.chains * 2, `ศัตรูต่อเชนได้ ${their.chains} ครั้ง (ยาวสุด x${their.longestChain}) → จัดบล็อกของคุณให้โบนัสเชื่อมต่อ (⚡) ติดกันมากขึ้น`);
    if (!out.length) add(1, `ศัตรูทำดาเมจได้มากกว่า (${their.dealt} ต่อ ${my.dealt}) → อัปเลเวล skill ที่ทำดาเมจมากสุด หรือขยายตารางเพื่อวางเพิ่ม`);
  } else {
    if (pct(theirCtl, len) >= 20) add(pct(theirCtl, len), `คุณควบคุมศัตรูได้ ${sec(theirCtl)} วิ (${pct(theirCtl, len)}% ของการสู้)`);
    if (my.longestChain >= 3) add(my.chains * 2, `เชนของคุณทำงาน ${my.chains} ครั้ง (ยาวสุด x${my.longestChain})`);
    if (pct(their.thornsTaken, r.maxHp[foe]) >= 15) add(pct(their.thornsTaken, r.maxHp[foe]), `หนามของคุณสะท้อนใส่ศัตรู ${their.thornsTaken}`);
    if (my.growth >= 8) add(my.growth * 2, `คุณสะสมพลังโจมตีได้ถึง +${my.growth} ต่อการตี`);
    if (mt && mt[2] >= 40) add(mt[2], `${skillName(mt[0])} ของคุณทำดาเมจ ${mt[2]}% ของทั้งหมด`);
    if (!out.length) {
      if (my.dealt >= their.dealt) add(1, `คุณทำดาเมจได้มากกว่า (${my.dealt} ต่อ ${their.dealt})`);
      else if (fatigued) add(1, `คุณอึดกว่าในช่วงเหนื่อยล้า (โล่ ${my.shielded} ฟื้นเลือด ${my.healed}) แม้ทำดาเมจน้อยกว่า (${my.dealt} ต่อ ${their.dealt}) → เพิ่ม skill ที่ตีได้ จะชนะง่ายขึ้น`);
      else add(1, `คุณเหลือเลือดมากกว่าตอนจบ (โล่ ${my.shielded} ฟื้นเลือด ${my.healed})`);
    }
  }
  // blocks that never fired (both results): worth knowing
  const idle = myPlaced.filter((k) => {
    const i = builds[me].skills.indexOf(k);
    const st = r.stats[me][i];
    return st && st.c + st.tc === 0;
  });
  if (idle.length && !won) add(5, `skill ที่ไม่ได้ทำงานเลยในการสู้นี้: ${idle.map((k) => SKILLS[k.id]?.name ?? k.id).join(', ')} (คูลดาวน์ยาวกว่าการสู้)`);
  const bonusDmg = r.stats[me].reduce((n, x) => n + x.bd, 0);
  if (!won && myPlaced.length >= 4 && pct(bonusDmg, my.dealt) < 5)
    add(4, `โบนัสเชื่อมต่อแทบไม่ช่วยดาเมจ (${pct(bonusDmg, my.dealt)}%) → วางบล็อกให้ตรงเงื่อนไขของกันและกัน (บล็อกที่ติดโบนัสจะเรืองแสง)`);

  out.sort((a, b) => b[0] - a[0]);
  return { headline, facts, reasons: out.slice(0, 3).map((x) => x[1]) };
}
