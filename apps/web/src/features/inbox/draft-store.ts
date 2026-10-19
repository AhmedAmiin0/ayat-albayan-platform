// The unsent reply of each chat, kept for this tab's life (W5): it survives a thread switch (the
// pane is keyed by phone), the «قالب» toggle and the window flipping. A failed send is kept with
// its clientRequestId: sending that same text again reuses the id (rule 8), any other text gets a
// fresh one. Subscribable, so a remounted composer sees a failure restored by the old one. A
// sign-out bumps the generation: a send settling after it, started before, writes nothing back.

export interface Draft {
  text: string;
  /** The last failed send and why (`code`, an inbox.error key), so a remounted box can say so. */
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

/** The key for sending `text`: the failed attempt's when it is the same text (rule 8), else a new one. */
export function requestIdFor(draft: Draft, text: string): string {
  return draft.failed?.text === text ? draft.failed.id : crypto.randomUUID();
}
