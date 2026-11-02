import { isWaAuthError } from '@ab/shared';
import { z } from 'zod';
import type { ErrorTable } from '@/common/infra/http/errors';
import type { HttpFailure } from '@/common/infra/http/failure';
import type { GraphEnv } from '@/config/env/env';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// The Graph API's error tables (docs/36 h8, h8b): Meta's error body → WaError, by failure kind.

export const metaErrorSchema = z.object({
  error: z.object({
    message: z.string().optional(),
    code: z.number().optional(),
    error_user_msg: z.string().optional(),
    error_data: z.object({ details: z.string().optional() }).optional(),
  }),
});

type Status = Extract<HttpFailure, { kind: 'status' }>;

/** Only a status failure reaches the table's default (every other kind has its own entry). */
const NO_STATUS = { status: 0, body: null, text: '' };
const statusOf = (f: HttpFailure): Pick<Status, 'status' | 'body' | 'text'> =>
  f.kind === 'status' ? f : NO_STATUS;

/** Meta's `{ error: { code, message, error_data.details } }`; anything else keeps code null. */
export function waErrorFrom(f: HttpFailure): WaError {
  const { status, body, text } = statusOf(f);
  const meta = metaErrorSchema.safeParse(body);
  const fallback = `WhatsApp HTTP ${status}`;
  if (!meta.success) {
    return new WaError(fallback, { code: null, status, details: text || undefined });
  }
  const e = meta.data.error;
  const details = e.error_data?.details ?? e.error_user_msg;
  return new WaError(e.message ?? fallback, { code: e.code ?? null, status, details });
}

const KEY_REFUSED = new Set([401, 403]);

/** Kapso's own refusal: 401 / 403, no Meta auth code, and no Meta code that differs from it. */
function kapsoRefused(env: GraphEnv, info: WaError['info']): boolean {
  const kapsoKey = env.provider === 'kapso' && KEY_REFUSED.has(info.status);
  const ownCode = info.code === null || info.code === info.status;
  return kapsoKey && ownCode && !isWaAuthError(info.code);
}

/**
 * Kapso refusing its project key (HTTP 401 / 403 with no Meta code of its own) is a broken
 * credential: tagged `credential: 'kapso'` (never Meta's 190, whose words point at Business
 * Manager), so the sender holds the line's queue instead of failing every row and the admin is
 * told to fix KAPSO_API_KEY. Meta's own errors pass through unchanged.
 */
export function byDriver(env: GraphEnv, error: WaError): WaError {
  if (!kapsoRefused(env, error.info)) return error;
  const info = { ...error.info, credential: 'kapso' as const };
  return new WaError(`Kapso refused the API key: ${error.message}`, info);
}

/** The zod issues of a 2xx body that is not what the call expects, capped at 300 chars. */
const issuesOf = (f: HttpFailure): string => {
  const issues = f.kind === 'shape' ? f.issues : [];
  return new z.ZodError(issues).message.slice(0, 300);
};

/** A 2xx whose body is not what the call expects: Meta answered, but not as expected. */
const shapeError = (f: HttpFailure): WaError =>
  new WaError('Unexpected WhatsApp response', { code: null, status: 200, details: issuesOf(f) });

/** No credential involved: the table of every Graph call, and all of the download_url's. */
export const PLAIN: ErrorTable<WaError> = {
  network: (f) =>
    new WaError('WhatsApp request failed', {
      code: null,
      status: 0,
      uncertain: f.kind === 'network' && f.reached,
    }),
  timeout: () =>
    new WaError('WhatsApp request timed out', { code: null, status: 0, uncertain: true }),
  shape: shapeError,
  default: waErrorFrom,
};

/**
 * docs/36 h8b (1): a `POST {phone}/messages` that got a 2xx has reached Meta, so a body that does
 * not parse (no message id) is `uncertain`: the sender fails the row instead of sending it twice.
 */
export const SENT_SHAPE: Partial<ErrorTable<WaError>> = {
  shape: (f) => {
    const e = shapeError(f);
    return new WaError(e.message, { ...e.info, uncertain: true });
  },
};
