import { z } from 'zod';
import type { ErrorTable } from '@/common/infra/http/errors';
import type { HttpFailure } from '@/common/infra/http/failure';
import { GoogleApiError } from '@/modules/platform/google-sync/google-client.port';

// Google's failures as data (docs/36 h7): a status and Google's reason, never a token or a body.

const optionalText = z.string().optional().catch(undefined);

const apiError = z.looseObject({
  errors: z
    .array(z.looseObject({ reason: optionalText }))
    .optional()
    .catch(undefined),
  status: optionalText,
});

/** `{ error: 'invalid_grant' }` (OAuth) or `{ error: { errors: [{ reason }], status } }` (APIs). */
export const googleErrorSchema = z.looseObject({ error: z.union([z.string(), apiError]) });

type ErrorField = z.infer<typeof googleErrorSchema>['error'];

const reasonOfField = (err: ErrorField): string =>
  typeof err === 'string' ? err : (err.errors?.[0]?.reason ?? err.status ?? 'error');

/** Google's reason: `error.errors[0].reason`, `error.status`, or the OAuth `error` string. */
export function reasonOf(data: unknown): string {
  const parsed = googleErrorSchema.safeParse(data);
  return parsed.success ? reasonOfField(parsed.data.error) : 'error';
}

/** What google-auth-library (gaxios) throws: an answer's status and body, or a transport error. */
const thrownSchema = z.looseObject({
  status: z.number().optional().catch(undefined),
  response: z
    .looseObject({ status: z.number().optional().catch(undefined), data: z.unknown() })
    .optional()
    .catch(undefined),
  message: optionalText,
});

type Thrown = z.infer<typeof thrownSchema>;
const NOTHING: Thrown = {};

const transportReason = (message: string): string =>
  message.includes('invalid_grant') ? 'invalid_grant' : 'network';

const reasonOfThrown = (e: Thrown): string =>
  e.response?.data === undefined ? transportReason(e.message ?? '') : reasonOf(e.response.data);

/** Any failure → GoogleApiError(status, reason); no status (network) → 0 'network'. No token. */
export function toGoogleError(e: unknown): GoogleApiError {
  if (e instanceof GoogleApiError) return e;
  const parsed = thrownSchema.safeParse(e);
  const thrown = parsed.success ? parsed.data : NOTHING;
  const status = thrown.response?.status ?? thrown.status ?? 0;
  return new GoogleApiError(status, reasonOfThrown(thrown));
}

const statusOf = (f: HttpFailure): number =>
  f.kind === 'status' || f.kind === 'shape' ? f.status : 0;

const reasonOfFailure = (f: HttpFailure): string => reasonOf(f.kind === 'status' ? f.body : null);

const noAnswer = (): GoogleApiError => new GoogleApiError(0, 'network');

/**
 * Today's mapping: a non-2xx → GoogleApiError(status, Google's reason); no answer (network, the
 * 30 s timeout) → GoogleApiError(0, 'network'). A 2xx the call's schema rejects keeps its status.
 */
export const GOOGLE_ERRORS: ErrorTable<GoogleApiError> = {
  network: noAnswer,
  timeout: noAnswer,
  default: (f) => new GoogleApiError(statusOf(f), reasonOfFailure(f)),
};

/** A 404 / 410 on a lookup: deleted by someone in Google (GoogleHttp.maybe reads it as null). */
export class Gone extends Error {}

const gone = (): Error => new Gone('google: gone');

/** GOOGLE_ERRORS, plus 404 / 410 → Gone. */
export const LOOKUP_ERRORS: ErrorTable<Error> = { ...GOOGLE_ERRORS, 404: gone, 410: gone };
