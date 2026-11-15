import { draftGeneration, getDraft, keptFailed, setDraft } from './draft-store';
import { ownSendGeneration, recordOwnSend } from './own-send';

// What a template or rating send captured when it started (useMutation onMutate), so its result,
// if it settles after a sign-out on a shared PC, leaves nothing in the next user's tab (round 3).

export interface SendStart {
  own: number;
  draft: number;
}

/** useMutation `onMutate`: the tab-memory generations the send's result must still match. */
export const sendStart = (): SendStart => ({ own: ownSendGeneration(), draft: draftGeneration() });

/**
 * A template or rating went out: the log follows it (W4) and a refused text attempt is settled
 * (C); an unconfirmed one keeps its id for the box's retry (keptFailed).
 */
export function settleOwnSend(phone: string, messageId: string, start: SendStart): void {
  recordOwnSend(phone, messageId, start.own);
  const now = getDraft(phone);
  if (now.failed) setDraft(phone, { ...now, failed: keptFailed(now.failed) }, start.draft);
}
