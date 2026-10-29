import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

// The reply box's unsent text per chat (owner 2026-10-26 «عرض سعر»): lifted out of Composer so the
// quote sheet's «عدّل قبل الإرسال» can fill it. Kept when she leaves the chat, as WhatsApp's draft
// (review 2026-10-29 #4): the chats list shows «مسوّدة: …» on its row; a sign-out forgets every chat
// (clearComposerDrafts). In memory only (JS, OTA): a killed app starts clean.

const drafts = new Map<string, string>();
const listeners = new Set<() => void>();

export function getComposerText(phone: string): string {
  return drafts.get(phone) ?? '';
}

export function setComposerText(phone: string, text: string): void {
  if (text) drafts.set(phone, text);
  else drafts.delete(phone);
  listeners.forEach((l) => l());
}

/** Another screen's text after her unsent draft, a new line between (never overwrites what she typed). */
export function appendComposerText(phone: string, text: string): void {
  const now = getComposerText(phone).trim();
  setComposerText(phone, now ? `${now}\n${text}` : text);
}

/** A sign-out (the gate is out): nobody else on this phone reads the last user's half-written replies. */
export function clearComposerDrafts(): void {
  if (drafts.size === 0) return;
  drafts.clear();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The chat's unsent text, '' without one (a chats-list row reads it for «مسوّدة: …»). */
export function useComposerDraft(phone: string): string {
  return useSyncExternalStore(subscribe, () => getComposerText(phone));
}

type Next = string | ((now: string) => string);

/** The chat's box text and its setter (a value or an updater, as useState's); kept until sent or signed out. */
export function useComposerText(phone: string): [string, (next: Next) => void] {
  const text = useComposerDraft(phone);
  const set = useCallback(
    (next: Next) => setComposerText(phone, typeof next === 'function' ? next(getComposerText(phone)) : next),
    [phone],
  );
  return [text, set];
}

/**
 * Leaving the chat while `bound` (a saved reply's file waits in its chip): the text goes too, as before
 * drafts were kept, so it never comes back to be sent without the file it was picked with.
 */
export function useForgetDraftOnLeave(phone: string, bound: boolean): void {
  const now = useRef(bound);
  useEffect(() => {
    now.current = bound;
  }, [bound]);
  useEffect(
    () => () => {
      if (now.current) setComposerText(phone, '');
    },
    [phone],
  );
}
