import { useEffect, useState } from 'react';

/** How far below the fold a card counts as on screen: page 1 is asked just before it scrolls in. */
const AHEAD = '200px';

const onScreen = (entries: IntersectionObserverEntry[]): boolean =>
  entries.some((e) => e.isIntersecting);

/**
 * Whether the element under `ref` has been on screen once (owner 2026-11-01: a chat PDF asks its
 * page 1 only then, never a burst for a long log). It stays true when the card scrolls away; with
 * no IntersectionObserver (an old browser, jsdom) it is true at once.
 */
export function useSeenOnce(): { ref: (el: Element | null) => void; seen: boolean } {
  const [el, setEl] = useState<Element | null>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (!el || seen) return undefined;
    const seeIf = (entries: IntersectionObserverEntry[]) =>
      setSeen((was) => was || onScreen(entries));
    const io = new IntersectionObserver(seeIf, { rootMargin: AHEAD });
    io.observe(el);
    return () => io.disconnect();
  }, [el, seen]);
  return { ref: setEl, seen };
}
