import {
  EVOLUTION_HOOK_INTERNAL,
  evolutionHookUrl,
  type EvolutionConfig,
  type EvolutionHookOrigin,
} from '@ab/shared';
import {
  EVOLUTION_INTERNAL_DEFAULT,
  evolutionBase,
  evolutionBaseAllowed,
  evolutionInternalHosts,
  evolutionInternalList,
  type WaLine,
} from '@ab/catalog';
import { z } from 'zod';
import { numbersOverlay, overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import type { Env } from '@/config/env/env';
import { blankIsUnset, optionalSecret } from '@/config/env/env.blank';
import type { EvolutionLineEnv, WhatsappEnv } from './env.whatsapp';

/** Evolution driver (docs/19): base and global key shared; instance, token, engine per number. */
export const EVOLUTION_SHAPE = {
  /** https, or http on localhost / a listed internal host (SSRF guard, @ab/catalog). No default. */
  EVOLUTION_API_BASE: z.preprocess(blankIsUnset, evolutionBase.optional()),
  /** Docker service names an http base may name (the kit's `evolution-api` by default). */
  EVOLUTION_INTERNAL_HOSTS: z.preprocess(
    blankIsUnset,
    evolutionInternalHosts.default(EVOLUTION_INTERNAL_DEFAULT),
  ),
  /** The server's global key: admin checks only (connectionState, QR) when no token is saved. */
  EVOLUTION_API_KEY: optionalSecret,
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

/** Names of what an Evolution line lacks: the shared base, else the number's token or engine. */
export function evolutionGaps(env: Env, line: WaLine): string[] {
  if (evolutionBaseOf(env) === null) return ['EVOLUTION_API_BASE'];
  return evolutionLine(line) ? [] : ['evolution_token'];
}

type BaseKeys = Pick<Env, 'EVOLUTION_API_BASE' | 'EVOLUTION_INTERNAL_HOSTS'>;

/**
 * The Evolution base without a trailing slash; null when unset, or when it is plain http to a
 * host the internal allow-list does not name (SSRF guard: no call is ever made to it).
 */
export function evolutionBaseOf(env: BaseKeys): string | null {
  const base = env.EVOLUTION_API_BASE;
  const internal = evolutionInternalList(env.EVOLUTION_INTERNAL_HOSTS);
  return base && evolutionBaseAllowed(base, internal) ? base.replace(/\/+$/, '') : null;
}

/** API_PUBLIC_URL as an https origin (no path); anything else is no public origin. */
const HTTPS_ORIGIN = /^https:\/\/[A-Za-z0-9.-]+(:\d{1,5})?$/;
const publicOrigin = (raw: string | undefined): string | null => {
  const origin = (raw ?? '').trim().replace(/\/+$/, '');
  return HTTPS_ORIGIN.test(origin) ? origin : null;
};

const HOOK_ORIGIN: Record<EvolutionHookOrigin, (env: NodeJS.ProcessEnv) => string | null> = {
  internal: () => EVOLUTION_HOOK_INTERNAL,
  public: (env) => publicOrigin(env.API_PUBLIC_URL),
};

/**
 * The webhook URL Evolution posts a number's events to (security review: never typed by an
 * admin, the header carries the instance token): our origin + /webhooks/evolution/<instance>,
 * rebuilt from the current instance name on every push. null = the public origin is not set.
 */
export function evolutionHookOf(
  config: Pick<EvolutionConfig, 'webhook'>,
  instance: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  return evolutionHookUrl(HOOK_ORIGIN[config.webhook.origin](env), instance);
}
