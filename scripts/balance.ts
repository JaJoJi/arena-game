// Bots play thousands of fights → archetype matchup matrix.
// Vision target: no matchup above ~65%.   Usage: npm run balance -- [buildsPerArch] [day]
import { aiBuild } from '../src/sim/bot';
import { simulate } from '../src/sim/combat';
import { HEROES } from '../src/sim/heroes';
import { hashSeed } from '../src/sim/rng';
import { ARCHES, type Archetype, type Build } from '../src/sim/types';

const N = Number(process.argv[2] ?? 80);
const DAY = Number(process.argv[3] ?? 10);
const LIMIT = 0.65;

const builds = {} as Record<Archetype, Build[]>;
for (const a of ARCHES) {
  const hero = HEROES.find((h) => h.arch === a)!;
  builds[a] = Array.from({ length: N }, (_, i) => aiBuild(hero.id, DAY, [a], hashSeed('bal', a, DAY, i)));
}

let games = 0;
let ticks = 0;
const rate = (A: Build[], B: Build[]) => {
  let score = 0;
  let n = 0;
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 4; k++) {
      const j = (i * 7 + k * 13 + 3) % N;
      const seed = hashSeed('m', i, j, k);
      const r1 = simulate(A[i], B[j], seed, DAY); // A on the left
      const r2 = simulate(B[j], A[i], seed, DAY); // A on the right (cancels side bias)
      score += r1.winner === 0 ? 1 : r1.winner === -1 ? 0.5 : 0;
      score += r2.winner === 1 ? 1 : r2.winner === -1 ? 0.5 : 0;
      n += 2;
      ticks += r1.ticks + r2.ticks;
    }
  }
  games += n;
  return score / n;
};

console.log(`\nDay ${DAY} builds, ${N} per archetype. Row = win rate vs column.\n`);
console.log('         ' + ARCHES.map((a) => a.padStart(9)).join(''));
const bad: string[] = [];
for (const a of ARCHES) {
  const row = ARCHES.map((b) => {
    const r = rate(builds[a], builds[b]);
    if (a !== b && r > LIMIT) bad.push(`${a} beats ${b} ${(r * 100).toFixed(0)}%`);
    return ((r * 100).toFixed(0) + '%').padStart(9);
  });
  console.log(a.padEnd(9) + row.join(''));
}
console.log(`\n${games} fights · avg fight ${(ticks / games / 10).toFixed(1)}s`);
console.log(bad.length ? `Over ${LIMIT * 100}%:\n  ` + bad.join('\n  ') : `All matchups within ${LIMIT * 100}% ✔`);
console.log('\nExample builds:');
for (const a of ARCHES) console.log(' ', a.padEnd(8), builds[a][0].skills.map((s) => `${s.id}${s.lv}`).join(' ') + `  (${builds[a][0].w}x${builds[a][0].h})`);
