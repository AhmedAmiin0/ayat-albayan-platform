import type { OverlayNumber } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, loadEnv } from '@/config/env/env';
import type { WhatsappEnv } from '@/config/env/whatsapp/env.whatsapp';

// docs/42 42-7: only a notifications lane on Meta's Graph API (meta, or kapso's proxy) may send
// several rows at once. The chat line, Evolution numbers (pacing) and the CRM (its rate limit)
// stay one at a time.

const GRAPH: ReadonlySet<string> = new Set(['meta', 'kapso']);

const onGraph = (env: WhatsappEnv | null): boolean =>
  env !== null && GRAPH.has(env.provider ?? 'meta');

/** The lane keys (legacy: a line; module mode: a number id) that may run a pool. */
export function pooledKeys(numbers: readonly OverlayNumber[] | null): ReadonlySet<string> {
  const legacy = onGraph(lineEnvs(loadEnv()).notifications) ? ['notifications'] : [];
  const byNumber = (numbers ?? [])
    .filter((n) => n.purpose === 'notifications' && onGraph(n.env))
    .map((n) => n.id);
  return new Set(numbers === null ? legacy : byNumber);
}
