import { TPS, fatigueStart } from './combat';
import { SKILLS } from './skills';
import type { Build, CombatResult, Side } from './types';
import { L } from '../i18n';

/**
 * Post-fight explanation (Thai or English, see i18n.ts), from the events and per-block stats of one fight.
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
const skillName = (id: string) => (id === 'thorns' ? L('หนาม', 'thorns') : id === 'burn' ? L('ไฟ', 'burn') : id === 'fatigue' ? L('ความเหนื่อยล้า', 'fatigue') : SKILLS[id]?.name ?? id);

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
export function explain(r: CombatResult, builds: [Build, Build], me: Side = 0, names: [string, string] = [L('คุณ', 'You'), L('ศัตรู', 'Enemy')]): Explanation {
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
  if (draw) how = L('เสมอ', 'Draw');
  else if (r.ticks >= 90 * TPS) how = L(`${won ? 'ชนะ' : 'แพ้'}เพราะหมดเวลา (เทียบเลือดที่เหลือเป็น %)`, `${won ? 'Won' : 'Lost'} on time (HP left compared as %)`);
  else if (fatigued) how = L(`${won ? 'ชนะ' : 'แพ้'}ช่วงเหนื่อยล้า (หลัง ${sec(fStart)} วิ ทั้งสองฝ่ายเสียเลือดเพิ่มทุกวินาที)`, `${won ? 'Won' : 'Lost'} in fatigue (after ${sec(fStart)}s both sides lose extra HP every second)`);
  else how = won ? L('ชนะน็อก', 'Won by knockout') : L('แพ้น็อก', 'Lost by knockout');
  const hpMe = `${Math.max(0, r.events.at(-1)?.s.hp[me] ?? 0)}/${r.maxHp[me]}`;
  const hpFoe = `${Math.max(0, r.events.at(-1)?.s.hp[foe] ?? 0)}/${r.maxHp[foe]}`;
  const headline = L(`${how} · ${sec(len)} วิ · เลือดเหลือ ${hpMe} ต่อ ${hpFoe}`, `${how} · ${sec(len)}s · HP left ${hpMe} vs ${hpFoe}`);

  // ---------- facts ----------
  const facts: string[] = [];
  const mt = topBlock(r, builds[me], me);
  const ft = topBlock(r, builds[foe], foe);
  facts.push(L(`ดาเมจรวม: ${names[me]} ${my.dealt} · ${names[foe]} ${their.dealt}`, `Total damage: ${names[me]} ${my.dealt} · ${names[foe]} ${their.dealt}`));
  if (mt) facts.push(L(`skill ที่ทำดาเมจมากสุดของ${names[me]}: ${skillName(mt[0])} ${mt[1]} (${mt[2]}%)`, `Top damage skill for ${names[me]}: ${skillName(mt[0])} ${mt[1]} (${mt[2]}%)`));
  if (ft) facts.push(L(`skill ที่ทำดาเมจมากสุดของ${names[foe]}: ${skillName(ft[0])} ${ft[1]} (${ft[2]}%)`, `Top damage skill for ${names[foe]}: ${skillName(ft[0])} ${ft[1]} (${ft[2]}%)`));
  if (my.chains || their.chains)
    facts.push(L(`เชน: ${names[me]} ${my.chains} ครั้ง (ยาวสุด x${my.longestChain || 1}) · ${names[foe]} ${their.chains} ครั้ง (ยาวสุด x${their.longestChain || 1})`, `Chains: ${names[me]} ${my.chains} (longest x${my.longestChain || 1}) · ${names[foe]} ${their.chains} (longest x${their.longestChain || 1})`));
  const myCtl = r.stats[foe].reduce((n, x) => n + x.fz, 0); // control applied TO me
  const theirCtl = r.stats[me].reduce((n, x) => n + x.fz, 0);
  if (myCtl || theirCtl) facts.push(L(`โดนควบคุม (แช่แข็ง/ถ่วงเวลา): ${names[me]} ${sec(myCtl)} วิ · ${names[foe]} ${sec(theirCtl)} วิ`, `Time controlled (freeze/delay): ${names[me]} ${sec(myCtl)}s · ${names[foe]} ${sec(theirCtl)}s`));
  if (my.bigHit || their.bigHit)
    facts.push(`${L('ตีแรงสุด', 'Biggest hit')}: ${names[me]} ${my.bigHit}${my.bigHitSrc ? ` (${skillName(my.bigHitSrc)})` : ''} · ${names[foe]} ${their.bigHit}${their.bigHitSrc ? ` (${skillName(their.bigHitSrc)})` : ''}`);

  // ---------- reasons (scored, highest first) ----------
  const out: [number, string][] = [];
  const add = (score: number, text: string) => score > 0 && out.push([score, text]);
  const myPlaced = builds[me].skills.filter((k) => k.x >= 0);
  if (!won) {
    const lostHp = r.maxHp[me];
    if (pct(myCtl, len) >= 20)
      add(pct(myCtl, len), L(`คุณโดนแช่แข็ง/ถ่วงเวลา ${sec(myCtl)} วิ (${pct(myCtl, len)}% ของการสู้) skill ของคุณแทบไม่ได้ออก → ลอง ใจเหล็ก (ลดการควบคุม 60%) หรือ ชำระล้าง (ลบการแช่แข็ง)`, `You were frozen/delayed for ${sec(myCtl)}s (${pct(myCtl, len)}% of the fight), so your skills barely fired → try Iron Will (control 60% weaker) or Cleanse (removes freeze)`));
    if (pct(my.blockedByFoe, my.dealt) >= 30)
      add(pct(my.blockedByFoe, my.dealt), L(`โล่ของศัตรูกันดาเมจคุณไป ${my.blockedByFoe} (${pct(my.blockedByFoe, my.dealt)}%) → ทุบหนัก (ทะลุโล่ครึ่งหนึ่ง), จุดไฟ (ไม่สนโล่) หรือ สลายเวท (ลบโล่ 30%)`, `The enemy shield blocked ${my.blockedByFoe} of your damage (${pct(my.blockedByFoe, my.dealt)}%) → Heavy Smash (pierces half), Ignite (ignores shields) or Dispel (removes 30% of shield)`));
    if (pct(my.thornsTaken, lostHp) >= 15)
      add(pct(my.thornsTaken, lostHp), L(`หนามของศัตรูสะท้อนใส่คุณ ${my.thornsTaken} → ตีน้อยครั้งแต่แรง (ทุบหนัก) แทนการตีรัว หรือ สลายเวท ลบหนาม`, `Enemy thorns reflected ${my.thornsTaken} at you → hit less often but harder (Heavy Smash) instead of many small hits, or Dispel the thorns`));
    if (pct(their.healed, my.dealt) >= 20)
      add(pct(their.healed, my.dealt), L(`ศัตรูฟื้นเลือด ${their.healed} (${pct(their.healed, my.dealt)}% ของดาเมจคุณ) → เกราะหนาม (ระหว่างมีหนาม ศัตรูฟื้นได้ครึ่งเดียว) หรือเร่งดาเมจให้จบเร็ว`, `The enemy healed ${their.healed} (${pct(their.healed, my.dealt)}% of your damage) → Thorn Armor (while you have thorns the enemy heals half) or more damage to end it sooner`));
    if (pct(my.burnTaken, lostHp) >= 25)
      add(pct(my.burnTaken, lostHp), L(`ไฟทำดาเมจคุณ ${my.burnTaken} (ไม่สนโล่) → ชำระล้าง ลบไฟ 2 กองที่แรงสุด`, `Burn dealt ${my.burnTaken} to you (ignores shields) → Cleanse removes the 2 strongest burn stacks`));
    if (their.growth >= 8 && their.growth > my.growth * 2)
      add(their.growth * 3, L(`ศัตรูสะสมพลังโจมตีได้ถึง +${their.growth} ต่อการตี (ของคุณ +${my.growth}) ยิ่งนานยิ่งแรง → สลายเวท ลบพลังโจมตี หรือทำดาเมจให้จบก่อนศัตรูโต`, `The enemy stacked +${their.growth} attack power per hit (yours +${my.growth}) and grew stronger over time → Dispel their power, or finish them before they grow`));
    if (fatigued && my.dealt < their.dealt)
      add(30, L(`สู้กันยืดเยื้อจนเหนื่อยล้า ศัตรูทำดาเมจได้มากกว่า (${their.dealt} ต่อ ${my.dealt}) → เพิ่ม skill ที่ตีได้ หรือเลเวลอัป skill หลัก`, `The fight dragged into fatigue and the enemy dealt more damage (${their.dealt} vs ${my.dealt}) → add skills that hit, or level up your main skill`));
    if (their.longestChain >= 3 && their.chains > my.chains * 2)
      add(their.chains * 2, L(`ศัตรูต่อเชนได้ ${their.chains} ครั้ง (ยาวสุด x${their.longestChain}) → จัดบล็อกของคุณให้โบนัสเชื่อมต่อ (⚡) ติดกันมากขึ้น`, `The enemy chained ${their.chains} times (longest x${their.longestChain}) → arrange your blocks so more connect bonuses (⚡) touch`));
    if (!out.length) add(1, L(`ศัตรูทำดาเมจได้มากกว่า (${their.dealt} ต่อ ${my.dealt}) → อัปเลเวล skill ที่ทำดาเมจมากสุด หรือขยายตารางเพื่อวางเพิ่ม`, `The enemy dealt more damage (${their.dealt} vs ${my.dealt}) → level up your top damage skill, or expand the grid to fit more`));
  } else {
    if (pct(theirCtl, len) >= 20) add(pct(theirCtl, len), L(`คุณควบคุมศัตรูได้ ${sec(theirCtl)} วิ (${pct(theirCtl, len)}% ของการสู้)`, `You controlled the enemy for ${sec(theirCtl)}s (${pct(theirCtl, len)}% of the fight)`));
    if (my.longestChain >= 3) add(my.chains * 2, L(`เชนของคุณทำงาน ${my.chains} ครั้ง (ยาวสุด x${my.longestChain})`, `Your chains fired ${my.chains} times (longest x${my.longestChain})`));
    if (pct(their.thornsTaken, r.maxHp[foe]) >= 15) add(pct(their.thornsTaken, r.maxHp[foe]), L(`หนามของคุณสะท้อนใส่ศัตรู ${their.thornsTaken}`, `Your thorns reflected ${their.thornsTaken} at the enemy`));
    if (my.growth >= 8) add(my.growth * 2, L(`คุณสะสมพลังโจมตีได้ถึง +${my.growth} ต่อการตี`, `You stacked +${my.growth} attack power per hit`));
    if (mt && mt[2] >= 40) add(mt[2], L(`${skillName(mt[0])} ของคุณทำดาเมจ ${mt[2]}% ของทั้งหมด`, `Your ${skillName(mt[0])} dealt ${mt[2]}% of all damage`));
    if (!out.length) {
      if (my.dealt >= their.dealt) add(1, L(`คุณทำดาเมจได้มากกว่า (${my.dealt} ต่อ ${their.dealt})`, `You dealt more damage (${my.dealt} vs ${their.dealt})`));
      else if (fatigued) add(1, L(`คุณอึดกว่าในช่วงเหนื่อยล้า (โล่ ${my.shielded} ฟื้นเลือด ${my.healed}) แม้ทำดาเมจน้อยกว่า (${my.dealt} ต่อ ${their.dealt}) → เพิ่ม skill ที่ตีได้ จะชนะง่ายขึ้น`, `You outlasted them in fatigue (shield ${my.shielded}, healing ${my.healed}) despite less damage (${my.dealt} vs ${their.dealt}) → add skills that hit to win more easily`));
      else add(1, L(`คุณเหลือเลือดมากกว่าตอนจบ (โล่ ${my.shielded} ฟื้นเลือด ${my.healed})`, `You had more HP left at the end (shield ${my.shielded}, healing ${my.healed})`));
    }
  }
  // blocks that never fired (both results): worth knowing
  const idle = myPlaced.filter((k) => {
    const i = builds[me].skills.indexOf(k);
    const st = r.stats[me][i];
    return st && st.c + st.tc === 0;
  });
  if (idle.length && !won) add(5, L(`skill ที่ไม่ได้ทำงานเลยในการสู้นี้: ${idle.map((k) => SKILLS[k.id]?.name ?? k.id).join(', ')} (คูลดาวน์ยาวกว่าการสู้)`, `Skills that never worked this fight: ${idle.map((k) => SKILLS[k.id]?.name ?? k.id).join(', ')} (cooldown longer than the fight)`));
  const bonusDmg = r.stats[me].reduce((n, x) => n + x.bd, 0);
  if (!won && myPlaced.length >= 4 && pct(bonusDmg, my.dealt) < 5)
    add(4, L(`โบนัสเชื่อมต่อแทบไม่ช่วยดาเมจ (${pct(bonusDmg, my.dealt)}%) → วางบล็อกให้ตรงเงื่อนไขของกันและกัน (บล็อกที่ติดโบนัสจะเรืองแสง)`, `Connect bonuses barely added damage (${pct(bonusDmg, my.dealt)}%) → place blocks to meet each other’s conditions (blocks with an active bonus glow)`));

  out.sort((a, b) => b[0] - a[0]);
  return { headline, facts, reasons: out.slice(0, 3).map((x) => x[1]) };
}
