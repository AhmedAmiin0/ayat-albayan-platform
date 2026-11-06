import type {
  EvolutionConfig, EvolutionSyncPart, EvolutionSyncState, EvolutionSyncView,
} from '@ab/shared';
import { z } from 'zod';
import type { EvolutionLineEnv } from '@/config/env/env';
import type { FetchLike } from '@/common/infra/http/failure';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';
import {
  evolutionHttp, evolutionPath,
} from '@/modules/messaging/whatsapp/drivers/evolution/evolution-http';
import { stateSchema } from '@/modules/messaging/whatsapp/drivers/evolution/evolution-shapes';
import * as B from './evolution-push-bodies';
import { proxyMatch, settingsMatch, webhookMatch } from './evolution-readback';

// Pushes one number's options to its Evolution instance and reads them back (owner 2026-11-06:
// «make all the evolution api options configurable»). The instance first (created with the
// global key when Evolution does not know it: no QR, nothing linked until an admin scans one),
// then settings, webhook and proxy, each set then found. A refused part is `failed`, the others
// still go; the token refused on the instance itself throws (502 evolution_auth).

const TIMEOUT_MS = 15_000;

export interface PushTarget {
  /** token = the instance key (Vault). Holds secrets: never log. */
  env: EvolutionLineEnv;
  config: EvolutionConfig;
  /** The server's global key: only to create a missing instance. */
  globalKey: string | null;
  proxyPassword: string | null;
  /** Test seam; the runtime client's fetch otherwise. */
  fetch?: FetchLike;
}

const http = (t: PushTarget, token = t.env.token) => {
  const seam = t.fetch ? { fetch: t.fetch } : {};
  return evolutionHttp({ env: { ...t.env, token }, timeoutMs: TIMEOUT_MS, ...seam });
};

const path = (t: PushTarget, route: string) => evolutionPath(t.env, route);
const anyBody = z.unknown();
const isMissing = (e: unknown): boolean => e instanceof WaError && e.info.status === 404;

/** The instance answers its key: synced; 404 = Evolution does not know it; else it throws. */
async function instanceKnown(t: PushTarget): Promise<EvolutionSyncState> {
  try {
    await http(t).json({ path: path(t, 'instance/connectionState'), schema: stateSchema });
    return 'synced';
  } catch (e) {
    if (isMissing(e)) return 'failed';
    throw e;
  }
}

/** The instance exists, else it is created with the global key (no QR: nothing is linked). */
async function ensureInstance(t: PushTarget): Promise<EvolutionSyncState> {
  if ((await instanceKnown(t)) === 'synced') return 'synced';
  if (!t.globalKey) return 'failed';
  const { instance, mode, token } = t.env;
  const json = B.createBody({ instance, mode, token, config: t.config });
  await http(t, t.globalKey).json({ path: 'instance/create', method: 'POST', json, schema: anyBody });
  return 'synced';
}

interface Part<S extends z.ZodType> {
  route: string;
  body: () => B.Body | null;
  found: S;
  match: (found: z.output<S>, c: EvolutionConfig) => boolean;
}

const PARTS = (t: PushTarget) => ({
  settings: {
    route: 'settings', found: B.settingsFound, match: settingsMatch,
    body: () => B.settingsBody(t.config),
  },
  webhook: {
    route: 'webhook', found: B.webhookFound, match: webhookMatch,
    body: () => (t.config.webhook.url === null ? null : B.webhookBody(t.config, t.env.token)),
  },
  proxy: {
    route: 'proxy', found: B.proxyFound, match: proxyMatch,
    body: () => B.proxyBody(t.config, t.proxyPassword),
  },
});

/** One part: set (when pushing), then find and compare. Never throws. */
async function part<S extends z.ZodType>(
  t: PushTarget,
  p: Part<S>,
  push: boolean,
): Promise<EvolutionSyncState> {
  const json = p.body();
  if (json === null) return 'skipped';
  try {
    const set = { path: path(t, `${p.route}/set`), method: 'POST' as const, json, schema: anyBody };
    if (push) await http(t).json(set);
    const found = await http(t).json({ path: path(t, `${p.route}/find`), schema: p.found });
    return p.match(found, t.config) ? 'synced' : 'drift';
  } catch {
    return 'failed';
  }
}

type Parts = Record<EvolutionSyncPart, EvolutionSyncState>;
const viewOf = (parts: Parts, now: Date): EvolutionSyncView => ({
  synced: Object.values(parts).every((s) => s === 'synced' || s === 'skipped'),
  checked_at: now.toISOString(),
  parts,
});

/** push = set then read back; otherwise read back only (GET …/evolution/sync). */
export async function syncEvolution(
  t: PushTarget,
  at: { push: boolean; now: Date },
): Promise<EvolutionSyncView> {
  const instance = at.push ? await ensureInstance(t) : await instanceKnown(t);
  const parts = PARTS(t);
  const run = <S extends z.ZodType>(p: Part<S>): Promise<EvolutionSyncState> | 'skipped' =>
    (instance === 'synced' ? part(t, p, at.push) : 'skipped');
  const [settings, webhook, proxy] = await Promise.all([
    run(parts.settings), run(parts.webhook), run(parts.proxy),
  ]);
  return viewOf({ instance, settings, webhook, proxy }, at.now);
}
