import type { WaProvider } from '@ab/shared';
import { isGraphEnv, type WhatsappEnv } from '@/config/env/env';
import { CrmWhatsappClient } from './drivers/crm/crm.client';
import { EvolutionWhatsappClient } from './drivers/evolution/evolution.client';
import { HttpWhatsappClient, type ClientOpts } from './whatsapp.client';
import type { WhatsappClient } from './whatsapp.types';

type Build = (env: WhatsappEnv, opts: ClientOpts) => WhatsappClient | null;

const graph: Build = (env, opts) => (isGraphEnv(env) ? new HttpWhatsappClient(env, opts) : null);

/** The client per driver; null = the env does not belong to that driver (never happens). */
const CLIENTS: Record<WaProvider, Build> = {
  meta: graph,
  kapso: graph,
  crm: (env, opts) => (env.provider === 'crm' ? new CrmWhatsappClient(env, opts) : null),
  evolution: (env, opts) =>
    env.provider === 'evolution' ? new EvolutionWhatsappClient(env, opts) : null,
};

/**
 * THE way to build a line's or a number's client (docs/19): meta and kapso get the Graph client, crm
 * CrmWhatsappClient, evolution EvolutionWhatsappClient. null = not configured: a client that
 * refuses every call before any request.
 */
export function whatsappClient(env: WhatsappEnv | null, opts: ClientOpts = {}): WhatsappClient {
  const built = env ? CLIENTS[env.provider ?? 'meta'](env, opts) : null;
  return built ?? new HttpWhatsappClient(null, opts);
}
