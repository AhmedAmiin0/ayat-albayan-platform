import type { EvolutionLineEnv } from '@/config/env/env';
import type { FetchLike } from '@/common/infra/http/failure';
import { evolutionJson } from './evolution-http';
import { qrOf, stateOf, type EvolutionQr } from './evolution-shapes';
import type { EvolutionState } from '@ab/shared';

// The admin's two read calls on an instance (docs/19 «Evolution driver»): «افحص الاتصال»
// (connectionState) and the QR panel (connect). Never a send. The key is the instance token, or
// the server's global key when the number has no token saved yet.

const TIMEOUT_MS = 10_000;

export interface InstanceCall {
  env: EvolutionLineEnv;
  fetch: FetchLike;
}

const conn = (c: InstanceCall) => ({ env: c.env, fetch: c.fetch, timeoutMs: TIMEOUT_MS });

/** GET /instance/connectionState/{instance}. */
export async function instanceState(c: InstanceCall): Promise<EvolutionState | null> {
  return stateOf(await evolutionJson(conn(c), { path: 'instance/connectionState' }));
}

/** GET /instance/connect/{instance}: starts the session when closed and answers its QR. */
export async function instanceQr(c: InstanceCall): Promise<EvolutionQr> {
  return qrOf(await evolutionJson(conn(c), { path: 'instance/connect' }));
}
