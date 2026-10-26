import { useCallback, useEffect, useSyncExternalStore } from 'react';

// The reply box's unsent text per chat (owner 2026-10-26 «عرض سعر»): lifted out of Composer so the
// quote sheet's «عدّل قبل الإرسال» can fill it. It lives as long as the chat's Composer, as its old
// useState did (leaving the chat forgets it, so a sign-out leaves nothing). JS only (OTA).

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

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

type Next = string | ((now: string) => string);

/** The chat's box text and its setter (a value or an updater, as useState's); forgotten on unmount. */
export function useComposerText(phone: string): [string, (next: Next) => void] {
  const text = useSyncExternalStore(subscribe, () => getComposerText(phone));
  useEffect(() => () => void drafts.delete(phone), [phone]);
  const set = useCallback(
    (next: Next) => setComposerText(phone, typeof next === 'function' ? next(getComposerText(phone)) : next),
    [phone],
  );
  return [text, set];
}
