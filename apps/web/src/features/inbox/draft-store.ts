// The unsent reply of each chat, kept for this tab's life (W5): it survives a thread switch (the
// pane is keyed by phone), the «قالب» toggle and the window flipping. A failed send is kept with
// its clientRequestId: sending that same text again reuses the id (rule 8), any other text gets a
// fresh one. Subscribable, so a remounted composer sees a failure restored by the old one.

export interface Draft {
  text: string;
  failed: { text: string; id: string } | null;
}

const EMPTY: Draft = { text: '', failed: null };
const drafts = new Map<string, Draft>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** The chat's draft, or the shared empty one (stable, for useSyncExternalStore). */
export function getDraft(phone: string): Draft {
  return drafts.get(phone) ?? EMPTY;
}

export function setDraft(phone: string, draft: Draft): void {
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
  drafts.clear();
  notify();
}

export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The key for sending `text`: the failed attempt's when it is the same text (rule 8), else a new one. */
export function requestIdFor(draft: Draft, text: string): string {
  return draft.failed?.text === text ? draft.failed.id : crypto.randomUUID();
}
