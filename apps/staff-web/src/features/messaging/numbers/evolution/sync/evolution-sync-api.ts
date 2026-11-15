import { evolutionSyncSchema, type EvolutionConfig, type EvolutionSyncView } from '@ab/shared';
import { z } from 'zod';
import { ApiError, apiFetch } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

// An Evolution number's options (numbers.manage, docs/19 «Evolution driver»): every answer is the
// sync view (each part pushed to Evolution, read back), parsed before it is shown.

const base = (id: string) => `/admin/numbers/${encodeURIComponent(id)}/evolution`;
const viewOf = (raw: unknown): EvolutionSyncView => evolutionSyncSchema.parse(raw);

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/** A write whose answer is the sync view (parsed, never trusted as typed). */
async function sendFor(method: 'PUT' | 'POST', path: string, body?: EvolutionConfig) {
  const json = body === undefined ? {} : { headers: JSON_HEADERS, body: JSON.stringify(body) };
  const raw: unknown = await apiFetch(path, { method, ...json });
  return viewOf(raw);
}

/** PUT …/evolution/config: saves every option, pushes them to Evolution and reads them back. */
export const putEvolutionConfig = (input: { id: string; config: EvolutionConfig }) =>
  sendFor('PUT', `${base(input.id)}/config`, input.config);

/** POST …/evolution/sync («مزامنة الآن»): pushes the saved options again. */
export const pushEvolutionSync = (id: string) => sendFor('POST', `${base(id)}/sync`);

/** GET …/evolution/sync («تحقق»): reads Evolution back only, writes nothing. */
export const readEvolutionSync = async (id: string) =>
  viewOf(await apiFetch(`${base(id)}/sync`));

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
