import { createHash } from 'node:crypto';
import { relayDedupParts } from './relay.kinds';
import type { RelayRequest } from './relay.schema';

// Rule 8: the script retries on 429 / 5xx with no idempotency key, so the same message inside one
// 15-minute window maps to one messages row (messages.dedup_key is unique) and is sent once.

const RELAY_WINDOW_MS = 15 * 60_000;
const RELAY_DEDUP_PREFIX = 'script-relay:';

/** 'script-relay:' + sha256(to | type | the type's content | the 15-minute window). */
export function relayDedupKey(req: RelayRequest, now: Date): string {
  const window = Math.floor(now.getTime() / RELAY_WINDOW_MS);
  const parts = [req.to, req.type, ...relayDedupParts(req), String(window)];
  return RELAY_DEDUP_PREFIX + createHash('sha256').update(parts.join('|'), 'utf8').digest('hex');
}
