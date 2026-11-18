import { useEffect, useRef } from 'react';

/** A browser element scrolls; jsdom (the unit tests) has no scrollIntoView. */
const scrolls = (el: HTMLElement | null): el is HTMLElement =>
  typeof el?.scrollIntoView === 'function';

/** Keeps the newest message in view: scrolls the end marker in whenever the newest one changes. */
export function useStickToEnd(newestId: string | undefined) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (scrolls(el)) el.scrollIntoView({ block: 'end' });
  }, [newestId]);
  return end;
}
