import { createHash, timingSafeEqual } from 'node:crypto';

// POST /webhooks/evolution/:instance is authenticated by the INSTANCE's own token (docs/19
// «Evolution driver»). Evolution signs nothing itself; its per-instance webhook sends the headers
// the admin set, so the instance is created with webhook headers
// {"x-evolution-token": "<instance token>"} and every delivery carries the token as is.
// Constant-time compare over digests (no length leak); no token = every POST is refused.

const EVOLUTION_TOKEN_HEADER = 'x-evolution-token';

/** Equal strings, compared in constant time over their SHA-256 digests. */
function same(a: string, b: string): boolean {
  const d = (s: string) => createHash('sha256').update(s, 'utf8').digest();
  return timingSafeEqual(d(a), d(b));
}

interface EvolutionAuthInput {
  headers: { [EVOLUTION_TOKEN_HEADER]?: string };
  /** The instance token (Vault); undefined = not configured: refused. */
  token: string | undefined;
}

type EvolutionVerdict = 'ok' | 'no_token' | 'missing' | 'bad';

const VERDICT = (input: EvolutionAuthInput): EvolutionVerdict => {
  const sent = input.headers[EVOLUTION_TOKEN_HEADER];
  if (sent === undefined) return 'missing';
  return same(sent, input.token ?? '') ? 'ok' : 'bad';
};

/** The verdict only; never a header value. */
export function verifyEvolution(input: EvolutionAuthInput): EvolutionVerdict {
  return input.token ? VERDICT(input) : 'no_token';
}
