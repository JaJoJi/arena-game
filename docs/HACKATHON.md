# Hackathon: Colosseum Eternal

Notes from research on 18 Nov 2026. Sources at the bottom.

## Goal

Enter **Colosseum Eternal**, Colosseum's perpetual hackathon (https://colosseum.com/eternal), with this game.

| | |
|---|---|
| Format | We start a **4-week sprint** whenever we are ready (window open Nov–Mar) |
| Deadline to start | **Sat 20 Mar 2027, 23:59 PDT** (Sun 21 Mar 13:59 Thai time). A sprint started in time may finish after the window closes |
| Weekly | 1-minute video update: what we prioritised, shipped, found hard (missing ones hurt the evaluation) |
| Final | Pitch video, technical demo, GitHub repo, team background, business context |
| Results | Reply within 14 days; Eternal Award winners picked in **May** |
| Prizes | **Eternal Award $25k USDC** (any chain; "step-function increase in onchain adoption"). **Accelerator $250k pre-seed**, 12 weeks (2 in San Francisco), **Solana only** |
| Competition | 112 Eternal submissions in H1 2026 (vs 2,857 at Frontier) |

**Judging:** founder–market fit, insight into a problem or trend, product and execution (shipping speed, response to feedback),
market size, founder communication, a scalable business. In the repo they look for **significant work done during the sprint**,
by the team itself, good prioritisation, and a **meaningful onchain integration**.

**Pre-existing work:** allowed but must be disclosed. Tag the repo before the sprint starts (e.g. `pre-sprint`) so the
sprint's work is easy to show. A product from an earlier Colosseum event may only come back with a material change.

**Decided so far:** target Eternal; chain = Solana (needed for the accelerator) unless we decide otherwise.

**Open decisions:** money model (needs Thai legal advice), how big the AI-agent angle is, Solana Mobile (Seeker) as the main
channel, team and founder story, sprint start date (suggested late Jan – Feb 2027).

## What we learn from past winners

### Grand champions (none are games)

| Event | Winner | What it is | Lesson |
|---|---|---|---|
| Frontier 2026 | CrowdBrain | Robotics DePIN: train people in simulation, send the best to teleoperate real robots | A real pilot before judging; new category on a hot trend |
| Cypherpunk 2025 | Unruggable | Solana-only hardware wallet + app | Founder entered **4 times** over 2.5 years; real hardware; deep founder–market fit |
| Breakout 2025 | TapeDrive | Onchain data storage | Infra the whole ecosystem needs |
| Radar 2024 | Reflect | Stablecoin / yield protocol | Sits on the money flow |
| Renaissance 2024 | Ore | Proof-of-work mining token | A new mechanic that went viral |

### Game winners

| Project | Result | Core idea | Where the money comes from |
|---|---|---|---|
| Supersize | Radar gaming #1 | Agar.io-style blobs, fully onchain in real time (MagicBlock); buy in with any token | Buy-in wagering |
| The Arena | Radar gaming #2 | PvP social trading game | Trading as a contest |
| Windfall | Radar gaming #3 | Luck games built on staked SOL | Staking yield funds rewards |
| Crypto Fantasy League | Breakout gaming #1 → accelerator | Fantasy league with tokens instead of players, scored on live prices | Token prices are the game; tournaments |
| The Syndicate | Frontier top 25 → Cohort 5 | Idle mafia strategy, weekly seasons and leagues; **email / Telegram login** | Packs + pass for cash; pack revenue funds open prize pools |
| One Arena | Frontier top 25 → Cohort 5 | TCG battles with graded physical cards as onchain assets; founder ex-Shadowverse | Collectibles; **6,800+ downloads on Solana Seeker**, $50k cup |
| WeLikeSports | Frontier top 25 → Cohort 5 | Fantasy pools (survivor, brackets, pick'em) | No house rake: interest on pooled money |

### Patterns

1. **Crypto is the core loop, not an add-on.** No winner is "a good game that happens to be onchain".
2. **Easy onboarding:** email / social login, mobile first.
3. **Real users before judging** (downloads, tournaments, mainnet).
4. **Founder–market fit** is visible (card-game pros build card games, traders build trading games).
5. **Ride the current trend:** 2026 = TCG/collectibles, AI agents, prediction markets, Solana Mobile; 2024 = real-time onchain games.
6. **Games are judged as businesses**, not on game design.

### Money models by legal risk (we are in Thailand: get legal advice first)

| Model | Example | Risk | Fits our vision |
|---|---|---|---|
| Buy-in wagering, winner takes the pot | Supersize, Scrim | High (gambling) | No (principle 4) |
| Gacha / loot packs | The Syndicate | Medium–high | No |
| Season pass → transparent onchain prize pool | close to The Syndicate | Medium | Yes (the vision already has a pass) |
| Yield / interest funds prizes, deposits never at risk | WeLikeSports, Windfall | Medium | Good, and stands out |
| No money: leaderboard + cosmetics | — | Low | Yes, but judges may find it weak |

## Where we stand

**Strengths:** deterministic simulation (anyone can re-run a fight → provably fair PvP without a randomness service);
async PvP (cheap onchain); bots that fight for you (vision Phase 4, an angle no game winner has used yet); short sessions,
mobile-friendly.

**Gaps:** no money mechanic ("why crypto?"), no users, founder story not written.

**Candidate pitch:** *a provably fair auto-battler where your strategy, written by you or an AI, fights 24/7.*
Build and fight results committed to Solana, anyone can verify a fight, strategies have onchain records credited to their
owner, season prize pool shown onchain (no player stakes), email login with an embedded wallet, Solana Mobile as a channel.

**Before the sprint:** make the core combat easy to start and fun to repeat (next step); pick the money model; build a
waitlist and playtesters; write the founder story; practise the English pitch; tag the pre-sprint code.

**Tool to try:** Colosseum Copilot (agent tool with project data from every Colosseum hackathon):
https://docs.colosseum.com/copilot

## Sources

- https://colosseum.com/eternal · https://colosseum.com/hackathon · https://colosseum.com/worldsfair
- https://blog.colosseum.com/announcing-the-winners-of-the-solana-frontier-hackathon/
- https://blog.colosseum.com/announcing-the-winners-of-the-solana-cypherpunk-hackathon/
- https://blog.colosseum.com/announcing-colosseums-accelerator-cohort-5/
- https://solana.com/news/solana-radar-winners · https://blockworks.com/news/solana-data-startup-wins-hackathon
- https://solanacompass.com/projects/unruggable · https://solanacompass.com/projects/supersize
- https://egamers.io/games/crypto-fantasy-league/ · https://docs.thesyndicate.games/
- https://genfinity.io/2026/10/15/rosentica-natsuki-one-arena-solana-rwa-collectibles-application-layer-interview/
- https://egamers.io/?p=120255
