import { evolutionCalls } from '@ab/client-core';
import { z } from 'zod';
import { ApiError, apiFetch, apiSend, t } from '@ab/web-kit';

// An Evolution number's options (numbers.manage, docs/19 «Evolution driver»): every answer is the
// sync view (each part pushed to Evolution, read back), parsed before it is shown.

const evolution = evolutionCalls({ apiFetch, apiSend });

/** Saves every option, pushes them to Evolution and reads them back. */
export const putEvolutionConfig = evolution.saveConfig;

/** Pushes the saved options to Evolution again. */
export const pushEvolutionSync = evolution.push;

/** Reads Evolution back only and writes nothing. */
export const readEvolutionSync = evolution.verify;

/** The codes these routes answer (400 / 409 / 502); anything else is said generically. */
export const EVOLUTION_CALL_ERRORS = [
  'not_evolution', 'evolution_not_configured', 'evolution_auth', 'evolution_unreachable',
  'evolution_rejected', 'evolution_cloud_ids', 'webhook_origin', 'cloud_ids_needed',
] as const;
const errorBodySchema = z.object({
  code: z.enum(EVOLUTION_CALL_ERRORS),
  /** Evolution's own words for a refused value (evolution_rejected). */
  detail: z.string().max(300).optional(),
  /** PUT …/config: the options were saved, only the push failed. */
  saved: z.literal(true).optional(),
});

/** A failed call in words: «saved but not pushed» first when so, Evolution's words last. */
export function evolutionErrorText(error: unknown): string {
  const errors = t.numbers.evolution.errors;
  const body = error instanceof ApiError ? errorBodySchema.safeParse(error.body).data : undefined;
  if (!body) return errors.generic;
  const words = [body.saved ? errors.savedNotPushed : '', errors[body.code], body.detail ?? ''];
  return words.filter((x) => x !== '').join(' ');
}
