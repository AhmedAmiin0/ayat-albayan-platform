import { EVOLUTION_MODES } from '@ab/shared';
import type { Env, EvolutionLineEnv } from '@/config/env/env';
import { evolutionBaseOf } from '@/config/env/whatsapp/env.evolution';
import type { NumberSource } from './numbers.env';

// An Evolution number's own config (docs/19 «Evolution driver»), beside numbers.env.ts.

/**
 * Evolution (docs/19 «Evolution driver»): EVOLUTION_API_BASE, the instance named by the row's
 * phone_number_id, ITS token (Vault, never the global key) and engine; null while one is missing.
 */
export function evolutionEnv({ row, secrets }: NumberSource, env: Env): EvolutionLineEnv | null {
  const base = evolutionBaseOf(env.EVOLUTION_API_BASE);
  const mode = EVOLUTION_MODES.find((m) => m === row.evolution_mode);
  const token = secrets.evolution_token;
  if (!base || !mode || !token) return null;
  const gapMs = env.EVOLUTION_SEND_GAP_MS;
  const autoSends = row.evolution_auto_sends;
  return { provider: 'evolution', base, instance: row.phone_number_id, token, mode, autoSends, gapMs };
}

/** An Evolution number's instance token, for its webhook (docs/19); nothing for another driver. */
export const evolutionTokenOf = ({ row, secrets }: NumberSource): { evolutionToken?: string } =>
  row.provider === 'evolution' && secrets.evolution_token ? { evolutionToken: secrets.evolution_token } : {};
