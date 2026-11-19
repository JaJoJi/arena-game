// Tiny async-PvP server: stores each player's build per day, matches by build rating,
// runs the fight, and keeps fights so replays can be shared by link.
// Storage is a JSON file — fine for a POC, swap for Postgres/Redis later.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync, createReadStream, statSync } from 'node:fs';
import { join, extname, resolve, normalize } from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import { SIM_VERSION, simulate } from '../sim/combat';
import { randomAiBuild } from '../sim/bot';
import { HEROES_BY_ID } from '../sim/heroes';
import { BONUS_KINDS, MAX_BONUS, validTarget } from '../sim/links';
import { SKILLS, isVariant } from '../sim/skills';
import { MAX_SLOTS, slotsFor } from '../sim/run';
import type { Build, Mark } from '../sim/types';

const PORT = Number(process.env.PORT ?? 8787);
const ROOT = resolve(import.meta.dirname, '../..');
const DATA_DIR = join(ROOT, 'data');
const DB_FILE = join(DATA_DIR, 'db.json');
const DIST = join(ROOT, 'dist');
const RATING_WINDOW = 200; // low-rated builds never get matched against far stronger ones
const PER_DAY_CAP = 300;
const FIGHT_CAP = 2000;

interface Snapshot {
  id: string;
  runId: string;
  name: string;
  day: number;
  build: Build;
  rating: number;
  v: number;
  defWins: number;
  defLosses: number;
  createdAt: number;
}
interface FightRec {
  id: string;
  day: number;
  seed: number;
  a: { name: string; build: Build };
  b: { name: string; build: Build; ai: boolean };
  winner: number;
  /** combat version the fight was simulated with */
  v: number;
  createdAt: number;
}
interface Db {
  snapshots: Snapshot[];
  fights: FightRec[];
}

function loadDb(): Db {
  try {
    const d = JSON.parse(readFileSync(DB_FILE, 'utf8')) as Db;
    // builds from an older combat version have another format: they can't fight or replay any more
    d.snapshots = d.snapshots.filter((x) => (x as Snapshot & { v?: number }).v === SIM_VERSION);
    d.fights = d.fights.filter((x) => x.v === SIM_VERSION);
    return d;
  } catch {
    return { snapshots: [], fights: [] };
  }
}
const db = loadDb();
let saveTimer: NodeJS.Timeout | null = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    // a failed write (no volume, no permission, disk full) must not take the server down: log it and keep playing
    try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(DB_FILE, JSON.stringify(db));
    } catch (e) {
      console.error('could not save', DB_FILE, (e as Error).message);
    }
  }, 300);
}

const MARKS: Mark[] = ['burn', 'echo', 'quick', 'steadfast'];
/** Builds come from the client (Phase 2 moves run state to the server): check everything that can be checked. */
function validateBuild(x: unknown, day: number): Build | string {
  const b = x as Build;
  if (!b || typeof b !== 'object' || !HEROES_BY_ID[b.hero]) return 'bad hero';
  // bought slots can add more than the day gives, but never past MAX_SLOTS
  if (!Array.isArray(b.skills) || b.skills.length > MAX_SLOTS || b.skills.length > slotsFor(day, MAX_SLOTS)) return 'bad skills';
  const skills = [];
  for (const s of b.skills) {
    if (!SKILLS[s?.id]) return 'unknown skill';
    if (SKILLS[s.id].hero && SKILLS[s.id].hero !== b.hero) return 'skill not allowed for hero';
    if (!isVariant(s.v)) return 'bad level';
    if (s.mark !== undefined && !MARKS.includes(s.mark)) return 'bad mark';
    const bonus = s.bonus ?? [];
    if (!Array.isArray(bonus) || bonus.length > MAX_BONUS) return 'bad bonus';
    for (const x of bonus) if (!BONUS_KINDS.includes(x?.e) || !validTarget(String(x?.t), b.hero)) return 'bad bonus';
    skills.push({
      id: s.id, v: s.v, ...(s.mark ? { mark: s.mark } : {}),
      ...(bonus.length ? { bonus: bonus.map((x) => ({ t: String(x.t), e: x.e })) } : {}),
    });
  }
  if (new Set(skills.map((s) => s.id)).size !== skills.length) return 'duplicate skill';
  return { hero: b.hero, skills };
}

const expected = (ra: number, rb: number) => 1 / (1 + Math.pow(10, (rb - ra) / 400));

function handleFight(body: any) {
  const runId = String(body?.runId ?? '').slice(0, 64);
  const name = String(body?.name ?? 'ผู้เล่น').slice(0, 24) || 'ผู้เล่น';
  const day = Number(body?.day);
  const rating = Number.isFinite(body?.rating) ? Number(body.rating) : 1000;
  if (!runId || !Number.isInteger(day) || day < 1 || day > 20) return { status: 400, json: { error: 'bad request' } };
  const build = validateBuild(body?.build, day);
  if (typeof build === 'string') return { status: 400, json: { error: build } };

  // Matchmaking: same day of the run, closest build rating, within a window. No counter-picking.
  const pool = db.snapshots
    .filter((s) => s.day === day && s.runId !== runId && Math.abs(s.rating - rating) <= RATING_WINDOW)
    .sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating))
    .slice(0, 5);
  const seed = randomInt(0, 2 ** 32 - 1);
  let opp: { snap?: Snapshot; name: string; build: Build; rating: number; ai: boolean };
  if (pool.length) {
    const snap = pool[randomInt(0, pool.length)];
    opp = { snap, name: snap.name, build: snap.build, rating: snap.rating, ai: false };
  } else {
    const aiB = randomAiBuild(day, randomInt(0, 2 ** 32 - 1));
    opp = { name: `AI · ${HEROES_BY_ID[aiB.hero].name}`, build: aiB, rating, ai: true };
  }

  const result = simulate(build, opp.build, seed, day);
  const won = result.winner === 0;
  const score = won ? 1 : result.winner === -1 ? 0.5 : 0;
  const newRating = Math.round(rating + 32 * (score - expected(rating, opp.rating)));
  if (opp.snap) {
    opp.snap.rating = Math.round(opp.snap.rating + 32 * (1 - score - expected(opp.snap.rating, rating)));
    if (won) opp.snap.defLosses++;
    else opp.snap.defWins++; // owner loses nothing; later: notify them their build won
  }

  // Save this player's build for this day so others can fight it.
  const existing = db.snapshots.findIndex((s) => s.runId === runId && s.day === day);
  const snap: Snapshot = {
    id: randomUUID(), runId, name, day, build, rating: newRating, v: SIM_VERSION, defWins: 0, defLosses: 0, createdAt: Date.now(),
  };
  if (existing >= 0) db.snapshots[existing] = snap;
  else db.snapshots.push(snap);
  const sameDay = db.snapshots.filter((s) => s.day === day);
  if (sameDay.length > PER_DAY_CAP) {
    const oldest = sameDay.sort((a, b) => a.createdAt - b.createdAt)[0];
    db.snapshots.splice(db.snapshots.indexOf(oldest), 1);
  }

  const fight: FightRec = {
    id: randomUUID().slice(0, 8), day, seed,
    a: { name, build }, b: { name: opp.name, build: opp.build, ai: opp.ai },
    winner: result.winner, v: SIM_VERSION, createdAt: Date.now(),
  };
  db.fights.push(fight);
  if (db.fights.length > FIGHT_CAP) db.fights.splice(0, db.fights.length - FIGHT_CAP);
  save();

  return {
    status: 200,
    json: {
      fightId: fight.id, seed, day,
      opponent: { name: opp.name, ai: opp.ai, build: opp.build, rating: opp.rating },
      result, won, rating: newRating,
    },
  };
}

function send(res: ServerResponse, status: number, json: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(json));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((ok, fail) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > 64 * 1024) {
        fail(new Error('too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        ok(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        fail(e);
      }
    });
  });
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json',
};
function serveStatic(url: string, res: ServerResponse) {
  if (!existsSync(DIST)) return send(res, 404, { error: 'not found (run `npm run build` or use `npm run dev`)' });
  let p = normalize(join(DIST, decodeURIComponent(url.split('?')[0])));
  if (!p.startsWith(DIST)) return send(res, 403, { error: 'forbidden' });
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(DIST, 'index.html');
  res.writeHead(200, { 'content-type': MIME[extname(p)] ?? 'application/octet-stream' });
  createReadStream(p).pipe(res);
}

createServer(async (req, res) => {
  const url = req.url ?? '/';
  try {
    if (req.method === 'POST' && url === '/api/fight') {
      const r = handleFight(await readBody(req));
      return send(res, r.status, r.json);
    }
    const m = url.match(/^\/api\/replay\/([\w-]{1,40})$/);
    if (req.method === 'GET' && m) {
      const f = db.fights.find((x) => x.id === m[1]);
      return f ? send(res, 200, f) : send(res, 404, { error: 'replay not found' });
    }
    if (req.method === 'GET' && url === '/api/stats') {
      return send(res, 200, { snapshots: db.snapshots.length, fights: db.fights.length });
    }
    if (url.startsWith('/api/')) return send(res, 404, { error: 'not found' });
    serveStatic(url, res);
  } catch (e) {
    send(res, 400, { error: String((e as Error).message ?? e) });
  }
}).listen(PORT, () => console.log(`arena server on http://localhost:${PORT}`));
