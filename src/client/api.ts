import type { Build, CombatResult } from '../sim/types';

export interface FightResponse {
  fightId?: string;
  seed: number;
  day: number;
  opponent: { name: string; ai: boolean; build: Build; rating: number };
  result: CombatResult;
  won: boolean;
  rating: number;
  offline?: boolean;
}

export interface ReplayRecord {
  id: string;
  day: number;
  seed: number;
  a: { name: string; build: Build };
  b: { name: string; build: Build; ai: boolean };
  winner: number;
  v: number;
}

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { 'content-type': 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return (await r.json()) as T;
}

export const api = {
  fight: (body: { runId: string; name: string; day: number; rating: number; build: Build }) =>
    req<FightResponse>('/api/fight', { method: 'POST', body: JSON.stringify(body) }),
  replay: (id: string) => req<ReplayRecord>('/api/replay/' + encodeURIComponent(id)),
};
