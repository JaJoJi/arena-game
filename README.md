# Arena POC (ชื่อชั่วคราว)

Proof of concept for the async auto-battler in the vision doc: pick a hero, buy skill blocks day by day,
pack them into a grid (placement is the combo), fight other players' saved builds from the same day,
win 8 before HP 20 runs out. Full combat design: see the combat doc and `docs/ROADMAP.md`.

## Run

```bash
npm install
npm run dev          # server :8787 + Vite client :5173 → open http://localhost:5173
```

Production-style: `npm run build && npm start` → http://localhost:8787 (server also serves the built client).

| Command | What it does |
|---|---|
| `npm test` | 500 random fights, each simulated twice: must be identical (determinism) |
| `npm run balance -- 80 10` | bots build 80 day-10 builds per archetype, prints the matchup matrix (target ≤ 65%) |
| `npm run smoke` | against a running server: two players meet async, replay re-simulates identically, cheat build rejected |
| `npm run typecheck` | TypeScript check |

## Structure

```
src/sim/      pure TypeScript, no DOM/Node APIs: runs on server AND browser
  combat.ts   simulate(buildA, buildB, seed, day) → events + per-skill stats (deterministic, 10 ticks/s)
              every placed skill runs its own cooldown in parallel; trigger bonuses + engines chain
  grid.ts     shapes, rotation, placement, touch-based connect bonuses, seeded shop rolls
  skills.ts   18 shared skills + 4 hero-unique skills
  heroes.ts   4 heroes (one per archetype); passives are combat hooks
  run.ts      one run: income, streaks, shop, slots, HP loss = day number, last chance
  bot.ts      rule-based bot (no LLM): AI opponents + balance testing
  rng.ts      seeded PRNG
src/server/   Node http + JSON file (data/db.json): matchmaking by build rating, replays
src/client/   Phaser 3 + HTML UI (Thai text in HTML/Kanit)
  townScene.ts   side-scrolling fantasy town: drag/fling, wheel, arrow keys, minimap, tap a landmark
  townArt.ts     all town pixel art drawn in code (buildings, parallax mountains/castle/forest)
  townData.ts    landmark list: name, position, what it does / will do
  combatScene.ts side-view arena replay (colosseum background)
scripts/      determinism, balance, smoke tests
```

**Key idea:** the server runs the fight and returns the events plus the seed. The browser only plays them back.
A replay link stores builds and seed, and any client re-simulates the exact same fight.

## What's in the POC (from the vision doc)

- Run loop: 20 HP, lose HP = day number, 8 wins ends run, win-streak bonus > loss-streak comeback money
- Shop: 3 random skill blocks (shape + 1–2 connect bonuses rolled per copy), reroll, buy grid space,
  buy duplicate = level up (max Lv5, +1 bonus)
- Grid (5×3 → 7×5, buyable to 8×6) with drag/drop, rotate (right-click / R), 6-slot backpack
- Parallel cooldowns; connect bonuses (+damage, +shield, haste, power, ⚡ trigger) work when a matching
  block touches, any side; engines (ฟันเฟือง, เร่งเครื่อง); buff/debuff skills (ขยายพลัง, ชำระล้าง, สลายเวท)
- 4 archetypes: tank (ถึก), burst (ดาเมจ), scaling (โตไม่หยุด), control (ควบคุม); freeze pauses all cooldowns
  with diminishing returns and an 8s cap, ใจเหล็ก reduces control by 60%
- Readable fights: buff/debuff chips, clock-wipe cooldowns per skill, You vs Enemy summary, hover tooltips
- 32×32 pixel-art heroes drawn in code; concede button
- Last chance (โอกาสสุดท้าย): first death → 1 HP + pick ตื่นพลัง / ตราวิญญาณ / เสบียงสุดท้าย
- Async PvP: fight a saved build of the same day, closest rating within ±200, AI fills gaps and is labeled AI,
  defender loses nothing, full opponent build shown after the fight, shareable replay link
- Run saved in the browser, so reload and continue mid-run; offline fallback vs a local AI if the server is down

- Town hub (the home screen): 7 landmarks; สนามประลอง enters the arena, หอฮีโร่ shows the roster,
  the rest show what they will do (marked เร็วๆ นี้)

## Not in the POC yet

Town systems (idle resource farming, building upgrades, research, market), player-configured bots, daily rules, accounts and auth, marketplace / tickets / diamonds,
real art. The server trusts the client's run state (it validates builds but not how they were bought);
production needs server-side run state.

## Balance

Being retuned after the grid / engine / Lv5 changes (`npm run balance -- 40 10`). Target: no archetype pair above 65%.
