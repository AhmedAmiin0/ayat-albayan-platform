import { digestEqual } from '@/common/infra/crypto/safe-equal';

// POST /webhooks/evolution/:instance is authenticated by the INSTANCE's own token (docs/19
// «Evolution driver»). Evolution signs nothing itself; its per-instance webhook sends the headers
// the admin set, so the instance is created with webhook headers
// {"x-evolution-token": "<instance token>"} and every delivery carries the token as is.
// Constant-time compare over digests (no length leak); no token = every POST is refused.

const EVOLUTION_TOKEN_HEADER = 'x-evolution-token';

interface EvolutionAuthInput {
  headers: { [EVOLUTION_TOKEN_HEADER]?: string };
  /** The instance token (Vault); undefined = not configured: refused. */
  token: string | undefined;
}

type EvolutionVerdict = 'ok' | 'no_token' | 'missing' | 'bad';

const VERDICT = (input: EvolutionAuthInput): EvolutionVerdict => {
  const sent = input.headers[EVOLUTION_TOKEN_HEADER];
  if (sent === undefined) return 'missing';
  return digestEqual(sent, input.token ?? '') ? 'ok' : 'bad';
};

/** The verdict only; never a header value. */
export function verifyEvolution(input: EvolutionAuthInput): EvolutionVerdict {
  return input.token ? VERDICT(input) : 'no_token';
}
