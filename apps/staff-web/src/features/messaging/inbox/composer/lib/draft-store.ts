// The unsent reply of each chat, kept for this tab's life (W5): it survives a thread switch (the
// pane is keyed by phone), the «قالب» toggle and the window flipping. A failed send is kept with
// its clientRequestId: sending that same text again reuses the id (rule 8), any other text gets a
// fresh one. Subscribable, so a remounted composer sees a failure restored by the old one. A
// sign-out bumps the generation: a send settling after it, started before, writes nothing back.

import { SEND_UNCONFIRMED } from '@ab/client-core';

export interface Draft {
  text: string;
  /**
   * The last failed send and why (`code`, an inbox.error key), so a remounted box can say so. A
   * send with no answer (`send_unconfirmed`) pins its id for every next text of the box until a
   * send with it gets an answer (docs/44 BUG7).
   */
  failed: { text: string; id: string; code: string } | null;
}

const EMPTY: Draft = { text: '', failed: null };
const drafts = new Map<string, Draft>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let generation = 0;

/** Captured at submit; a write carrying an older one (the session it came from ended) is dropped. */
export const draftGeneration = (): number => generation;

/** The chat's draft, or the shared empty one (stable, for useSyncExternalStore). */
export function getDraft(phone: string): Draft {
  return drafts.get(phone) ?? EMPTY;
}

export function setDraft(phone: string, draft: Draft, from: number = generation): void {
  if (from !== generation) return;
  if (!draft.text && !draft.failed) drafts.delete(phone);
  else drafts.set(phone, draft);
  notify();
}

export function clearDraft(phone: string): void {
  drafts.delete(phone);
  notify();
}

/** Sign-out on a shared PC: forget every chat's draft. */
export function clearAllDrafts(): void {
  generation += 1;
  drafts.clear();
  notify();
}

export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


/**
 * The failed attempt still owns the box's next send: the same text (rule 8), or any text after a
 * send with no answer (docs/44 BUG7: an edited retry must not become a second message).
 */
type Failed = Draft['failed'];
export const keepsFailed = (failed: Failed, text: string): failed is NonNullable<Failed> =>
  failed !== null && (failed.code === SEND_UNCONFIRMED || failed.text === text.trim());

/**
 * What another send or a fill of the box (a template, a rating, a file, a saved reply, the quote
 * calculator, a payment link) leaves of the failure: an unconfirmed one stays until a send with its
 * id gets an answer (docs/44 H2: dropping it would give the retry a new id, a second message).
 */
export const keptFailed = (failed: Failed): Failed =>
  failed?.code === SEND_UNCONFIRMED ? failed : null;

/** The key for sending `text`: the failed attempt's when it still owns the box, else a new one. */
export function requestIdFor(draft: Draft, text: string): string {
  return keepsFailed(draft.failed, text) ? draft.failed.id : crypto.randomUUID();
}
