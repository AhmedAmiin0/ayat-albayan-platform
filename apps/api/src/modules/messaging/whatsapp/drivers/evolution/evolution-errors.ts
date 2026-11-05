import { WA_ERROR } from '@ab/shared';
import { z } from 'zod';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// Evolution API's failures → WaError (docs/19 «Evolution driver»). Evolution answers every error
// as {status, error, response: {message}} (src/main.ts); `message` is a string or an array.

const envelopeSchema = z.object({
  response: z.object({ message: z.unknown() }).optional(),
  error: z.string().optional(),
});

/** sendMessageWithTyping's 400 when the number is not on WhatsApp: [{exists:false, jid}]. */
const notOnWhatsappSchema = z.array(z.object({ exists: z.literal(false) })).min(1);

/** The instance itself is down (no session): the line, not the message. Nothing was sent. */
const LINE_DOWN = /connection closed|not connected|instance does not exist|does not exist/i;

export interface EvolutionFailure {
  status: number;
  text: string;
}

function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** The answer's own words, capped; a body that is not Evolution's envelope says nothing. */
function said(text: string): { words: string; raw: unknown } {
  const env = envelopeSchema.safeParse(parsed(text));
  const raw = env.success ? env.data.response?.message : undefined;
  const words = typeof raw === 'string' ? raw : JSON.stringify(raw ?? env.data?.error ?? '');
  return { words: (words ?? '').slice(0, 300), raw };
}

type Kind = 'auth' | 'lineDown' | 'notOnWhatsapp' | 'later' | 'uncertain' | 'plain';

const isAuth = (status: number): boolean => status === 401 || status === 403;
const isMissingInstance = (status: number): boolean => status === 404;
/** A proxy's «try later»: nothing was sent, another try may pass. */
const LATER: ReadonlySet<number> = new Set([408, 425, 429]);

/** One classification per answer: the first rule that matches wins. */
const RULES: readonly { kind: Kind; test: (f: EvolutionFailure, s: ReturnType<typeof said>) => boolean }[] = [
  { kind: 'auth', test: (f) => isAuth(f.status) },
  { kind: 'lineDown', test: (f, s) => isMissingInstance(f.status) || LINE_DOWN.test(s.words) },
  { kind: 'notOnWhatsapp', test: (_f, s) => notOnWhatsappSchema.safeParse(s.raw).success },
  { kind: 'later', test: (f) => LATER.has(f.status) },
  { kind: 'uncertain', test: (f) => f.status >= 500 },
  { kind: 'plain', test: () => true },
];

type Info = WaError['info'];

/** What each kind adds to the error's info. */
const INFO: Record<Kind, Partial<Info>> = {
  // The key or the instance token is refused, or the instance is gone / logged out: held like
  // Meta's 190 (rows stay queued, uncounted), in Evolution's own words (evolution_auth).
  auth: { credential: 'evolution' },
  lineDown: { credential: 'evolution' },
  notOnWhatsapp: { code: WA_ERROR.undeliverable },
  // Retried with backoff (code null, docs/12 §3.3).
  later: {},
  // Baileys may have handed the message to WhatsApp before failing: never resent automatically.
  uncertain: { uncertain: true },
  // Any other 4xx (a bad body, an unknown route): nothing was sent and a retry fails the same way,
  // so it fails at once like Meta's #100 (never retried).
  plain: { code: WA_ERROR.invalidParameter },
};

/** Evolution's non-2xx answer → WaError. Never carries the URL, a header or the body sent. */
export function evolutionError(f: EvolutionFailure): WaError {
  const s = said(f.text);
  const kind = RULES.find((r) => r.test(f, s))?.kind ?? 'plain';
  const info: Info = { code: null, status: f.status, details: s.words || undefined, ...INFO[kind] };
  return new WaError(`Evolution HTTP ${f.status}${s.words ? `: ${s.words}` : ''}`, info);
}

/** A 2xx whose body is not what the call expects: it may have been sent (send) or not (read). */
export function evolutionShapeError(what: string, uncertain: boolean): WaError {
  return new WaError(`Evolution answered ${what} in an unexpected shape`, {
    code: null,
    status: 200,
    uncertain,
  });
}
