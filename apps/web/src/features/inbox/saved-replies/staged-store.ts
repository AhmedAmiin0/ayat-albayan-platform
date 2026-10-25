import type { SavedReplyAttachment } from '@ab/shared';

// The attachment a picked reply stages for each chat (a removable chip above the box), kept for the
// tab's life like the draft. It goes after the text, through the chat's own file send, with its own
// clientRequestId kept across retries (rule 8; the id namespace is shared with text sends).

export interface Staged {
  replyId: string;
  attachment: SavedReplyAttachment;
  requestId: string;
  /** Why the last attempt failed (an inbox.error key); the chip stays with a retry. */
  failed: string | null;
}

const staged = new Map<string, Staged>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const getStaged = (phone: string): Staged | null => staged.get(phone) ?? null;

export function setStaged(phone: string, next: Staged | null): void {
  if (next) staged.set(phone, next);
  else staged.delete(phone);
  notify();
}

/** Sign-out on a shared PC (tab-memory): forget every chat's chip. */
export function clearAllStaged(): void {
  staged.clear();
  notify();
}

export function subscribeStaged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
