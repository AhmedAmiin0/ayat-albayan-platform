import { WA_ERROR } from '@ab/shared';
import { z } from 'zod';
import type { ErrorTable } from '@/common/infra/http/errors';
import type { HttpFailure } from '@/common/infra/http/failure';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// Evolution API's failures → WaError, as a table (docs/19 «Evolution driver», docs/36 H-3).
// Evolution answers every error as {status, error, response: {message}} (src/main.ts); the
// message is a string or an array (a 400 for a number not on WhatsApp: [{exists:false, jid}]).

export const evolutionErrorSchema = z.looseObject({
  error: z.string().optional(),
  response: z.looseObject({ message: z.unknown() }).optional(),
});

/** sendMessageWithTyping's 400 when the number is not on WhatsApp. */
const notOnWhatsappSchema = z.array(z.looseObject({ exists: z.literal(false) })).min(1);

const notOnWhatsapp = (raw: unknown): boolean => notOnWhatsappSchema.safeParse(raw).success;

/** The instance itself is down (no session): the line, not the message. Nothing was sent. */
const LINE_DOWN = /connection closed|not connected|does not exist/i;
/** A Cloud instance passes Meta's 24 h refusal on in its words (131047, re-engagement). */
const WINDOW = /131047|re-?engagement|24[- ]hour/i;

interface Said {
  status: number;
  words: string;
  raw: unknown;
}

const wordsOf = (raw: unknown): string => (typeof raw === 'string' ? raw : JSON.stringify(raw));

/** Only a status failure reaches the table's default (every other kind has its own entry). */
const NO_STATUS = { status: 0, body: null };
const statusOf = (f: HttpFailure): { status: number; body: unknown } =>
  f.kind === 'status' ? f : NO_STATUS;

/** Evolution's own words: response.message, else error. */
function rawOf(body: unknown): unknown {
  const parsed = evolutionErrorSchema.safeParse(body);
  return parsed.data?.response?.message ?? parsed.data?.error;
}

function saidOf(f: HttpFailure): Said {
  const { status, body } = statusOf(f);
  const raw = rawOf(body);
  return { status, words: raw === undefined ? '' : wordsOf(raw).slice(0, 300), raw };
}

type Info = Partial<WaError['info']>;

/** The first rule that matches adds its fields; the rest keep code null (retried). */
const RULES: readonly { test: (s: Said) => boolean; info: Info }[] = [
  // The token refused, or the instance gone / logged out: held like Meta's 190 (rows stay
  // queued, uncounted), in Evolution's own words (evolution_auth).
  { test: (s) => s.status === 401 || s.status === 403, info: { credential: 'evolution' } },
  { test: (s) => s.status === 404 || LINE_DOWN.test(s.words), info: { credential: 'evolution' } },
  { test: (s) => notOnWhatsapp(s.raw), info: { code: WA_ERROR.undeliverable } },
  // Meta's own code: the #629 window rules see the window closing (Cloud mode only).
  { test: (s) => s.status < 500 && WINDOW.test(s.words), info: { code: WA_ERROR.reEngagement } },
  // A proxy's «try later»: nothing was sent; retried with backoff.
  { test: (s) => [408, 425, 429].includes(s.status), info: {} },
  // Baileys may have handed the message to WhatsApp before failing: never resent automatically.
  { test: (s) => s.status >= 500, info: { uncertain: true } },
  // Any other 4xx: nothing was sent, a retry fails the same way: fails at once like Meta's #100.
  { test: () => true, info: { code: WA_ERROR.invalidParameter } },
];

/** Evolution's non-2xx answer → WaError. Never the URL, a header or the body sent. */
export function evolutionError(f: HttpFailure): WaError {
  const s = saidOf(f);
  const info = RULES.find((r) => r.test(s))?.info ?? {};
  const message = `Evolution HTTP ${s.status}${s.words ? `: ${s.words}` : ''}`;
  const details = s.words || undefined;
  return new WaError(message, { code: null, status: s.status, details, ...info });
}

/** A 2xx whose body is not what the call expects: a send may have gone out (uncertain). */
const shape = (uncertain: boolean) => (): WaError =>
  new WaError('Unexpected Evolution response', { code: null, status: 200, uncertain });

/** The table of every Evolution call; `sent` = a message send (an odd 2xx is uncertain). */
export function evolutionTable(sent: boolean): ErrorTable<WaError> {
  return {
    network: (f) =>
      new WaError('Evolution request failed', {
        code: null,
        status: 0,
        uncertain: f.kind === 'network' && f.reached,
      }),
    timeout: () =>
      new WaError('Evolution request timed out', { code: null, status: 0, uncertain: true }),
    shape: shape(sent),
    default: evolutionError,
  };
}
