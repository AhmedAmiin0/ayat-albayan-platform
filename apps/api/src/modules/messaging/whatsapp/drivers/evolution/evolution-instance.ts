import type { EvolutionState } from '@ab/shared';
import { evolutionStateOf } from '@ab/shared';
import type { EvolutionLineEnv } from '@/config/env/env';
import type { FetchLike } from '@/common/infra/http/failure';
import { evolutionHttp, evolutionPath } from './evolution-http';
import { connectSchema, qrOf, stateSchema, type EvolutionQr } from './evolution-shapes';

// The admin's two read calls on an instance (docs/19 «Evolution driver»): «افحص الاتصال»
// (connectionState) and the QR panel (connect). Never a send. The key is the instance token, or
// the server's global key when the number has no token saved yet.

const TIMEOUT_MS = 10_000;

export interface InstanceCall {
  env: EvolutionLineEnv;
  /** Test seam; the runtime client's fetch otherwise. */
  fetch?: FetchLike;
}

const http = (c: InstanceCall) =>
  evolutionHttp({ env: c.env, timeoutMs: TIMEOUT_MS, ...(c.fetch ? { fetch: c.fetch } : {}) });

/** GET /instance/connectionState/{instance}. */
export async function instanceState(c: InstanceCall): Promise<EvolutionState | null> {
  const path = evolutionPath(c.env, 'instance/connectionState');
  const body = await http(c).json({ path, schema: stateSchema });
  return evolutionStateOf(body.instance.state);
}

/** GET /instance/connect/{instance}: starts the session when closed and answers its QR. */
export async function instanceQr(c: InstanceCall): Promise<EvolutionQr> {
  const path = evolutionPath(c.env, 'instance/connect');
  return qrOf(await http(c).json({ path, schema: connectSchema }));
}
