import { EVOLUTION_MODES, evolutionConfigOf, type EvolutionMode } from '@ab/shared';
import type { Env, EvolutionLineEnv } from '@/config/env/env';
import { evolutionBaseOf } from '@/config/env/whatsapp/env.evolution';
import type { NumberRow } from '@/modules/messaging/numbers/numbers.repo';
import type { NumberSource } from './numbers.env';

// An Evolution number's own config (docs/19 «Evolution driver»), beside numbers.env.ts.

type Secrets = NumberSource['secrets'];

/** The key the instance answers to: a Cloud instance's token IS its Meta access token. */
const TOKEN_OF: Record<EvolutionMode, (s: Secrets) => string | undefined> = {
  baileys: (s) => s.evolution_token,
  cloud: (s) => s.evolution_cloud_token ?? s.evolution_token,
};

/** The row's engine, or undefined when it names none (another provider). */
export const evolutionModeOf = (row: Pick<NumberRow, 'evolution_mode'>): EvolutionMode | undefined =>
  EVOLUTION_MODES.find((m) => m === row.evolution_mode);

/** The instance's key from the number's own secrets (never the global key). */
export const instanceToken = (mode: EvolutionMode, secrets: Secrets): string | undefined =>
  TOKEN_OF[mode](secrets);

/** The line env of an Evolution row: the shared base, the instance, its key and its options. */
export function evolutionLineEnv(
  row: NumberRow,
  at: { base: string; token: string; mode: EvolutionMode },
): EvolutionLineEnv {
  const { limits, sending } = evolutionConfigOf(row.evolution_config);
  return {
    provider: 'evolution', base: at.base, instance: row.phone_number_id, token: at.token,
    mode: at.mode, autoSends: row.evolution_auto_sends, gapMs: limits.gap_ms,
    dailyCap: limits.daily_cap, linkPreview: sending.link_preview,
  };
}

/**
 * Evolution (docs/19 «Evolution driver»): the allowed EVOLUTION_API_BASE, the instance named by
 * the row's phone_number_id, ITS token (Vault, never the global key), engine and options; null
 * while one is missing.
 */
export function evolutionEnv({ row, secrets }: NumberSource, env: Env): EvolutionLineEnv | null {
  const base = evolutionBaseOf(env);
  const mode = evolutionModeOf(row);
  const token = mode ? instanceToken(mode, secrets) : undefined;
  if (!base || !mode || !token) return null;
  return evolutionLineEnv(row, { base, token, mode });
}

/**
 * An Evolution number's marker and instance key (its webhook header, docs/19); nothing on another
 * driver. The marker lets the sender fail a row pinned to it while it cannot send.
 */
export function evolutionTokenOf(
  { row, secrets }: NumberSource,
): { evolution?: true; evolutionToken?: string } {
  const mode = row.provider === 'evolution' ? evolutionModeOf(row) : undefined;
  const token = mode ? instanceToken(mode, secrets) : undefined;
  const marker = row.provider === 'evolution' ? { evolution: true as const } : {};
  return token ? { ...marker, evolutionToken: token } : marker;
}
