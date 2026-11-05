import { EVOLUTION_GAP_DEFAULT_MS, evolutionBase, evolutionGapMs, type WaLine } from '@ab/shared';
import { z } from 'zod';
import { numbersOverlay, overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import type { Env } from '@/config/env/env';
import { blankIsUnset, optionalSecret } from '@/config/env/env.blank';
import type { EvolutionLineEnv, WhatsappEnv } from './env.whatsapp';

/**
 * The Evolution driver (docs/19 «Evolution driver»): a NUMBER sends through a self-hosted
 * Evolution API instance. The base and the global key are shared («التكاملات»); the instance name
 * (the row's phone_number_id), its token (Vault) and its engine (baileys | cloud) are the number's.
 */
export const EVOLUTION_SHAPE = {
  /** https, or http on localhost only (SSRF guard, @ab/catalog evolutionBase). No default. */
  EVOLUTION_API_BASE: z.preprocess(blankIsUnset, evolutionBase.optional()),
  /** The server's global key: admin checks only (connectionState, QR) when no token is saved. */
  EVOLUTION_API_KEY: optionalSecret,
  /** Baileys pacing: the minimum gap between two sends to different recipients. */
  EVOLUTION_SEND_GAP_MS: z.preprocess(
    blankIsUnset,
    evolutionGapMs.default(EVOLUTION_GAP_DEFAULT_MS),
  ),
};

const isEvolution = (e: WhatsappEnv | null | undefined): e is EvolutionLineEnv =>
  e?.provider === 'evolution';

/**
 * A line on evolution exists in module mode only: it is the role's default number's own config
 * (numbers.env.ts). Legacy mode has no instance or token keys, so such a line is not configured.
 */
export function evolutionLine(line: WaLine): EvolutionLineEnv | null {
  const id = numbersOverlay()?.numberIds[line];
  const env = overlayNumbers()?.find((n) => n.id === id)?.env;
  return isEvolution(env) ? env : null;
}

/**
 * NAMES of what an Evolution line lacks: the shared base, else the number's own config (its
 * token or engine, set in «الأرقام»: the default number did not build a client).
 */
export function evolutionGaps(env: Env, line: WaLine): string[] {
  if (env.EVOLUTION_API_BASE === undefined) return ['EVOLUTION_API_BASE'];
  return evolutionLine(line) ? [] : ['evolution_token'];
}

/** The Evolution base without a trailing slash, or null when unset. */
export const evolutionBaseOf = (base: string | undefined): string | null =>
  base ? base.replace(/\/+$/, '') : null;
