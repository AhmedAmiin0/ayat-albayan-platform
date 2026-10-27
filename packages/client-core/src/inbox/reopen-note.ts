import type { ReopenTemplateOutcome } from '@ab/shared';

// «إعادة فتح المحادثة» (owner 2026-10-26) for web and mobile: what the note over a closed chat's
// composer says after POST /threads/:phone/reopen. Owner 2026-10-27: a request that sent nothing is
// never silent (send the template by hand); a restricted role or a window open after all shows nothing.

/** What the server answered, or `failed` when the request itself failed. */
export type ReopenState = ReopenTemplateOutcome | 'failed';

/** The key under `inbox.reopen` in ar.json / en.json. */
type ReopenNoteKey = 'requested' | 'requestedToday' | 'unavailable' | 'failed';

const NOTES: Partial<Record<ReopenState, ReopenNoteKey>> = {
  template_queued: 'requested',
  already_requested_today: 'requestedToday',
  template_unavailable: 'unavailable',
  not_sent: 'failed',
  failed: 'failed',
};

/** The note's key, or null (nothing asked yet, or nothing for this user to see). */
export function reopenNoteKey(state: ReopenState | null): ReopenNoteKey | null {
  return state ? (NOTES[state] ?? null) : null;
}
