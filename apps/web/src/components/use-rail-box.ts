import { useEffect, useRef } from 'react';

/** Space kept between the pinned page head and a rail, and under the rail. */
const GAP_PX = 16;

/**
 * For a fixed-height scroll area: publishes its own box as --rail-top (below the pinned page head)
 * and --rail-h (the rest of the area), so side panels (ui/rail.ts) fill exactly the visible part
 * and scroll inside themselves instead of being sized to the window.
 */
export function useRailBox<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const update = () => {
      const head = box.querySelector<HTMLElement>('[data-page-head]');
      const top = (head?.offsetHeight ?? 0) + GAP_PX;
      const height = `${Math.max(box.clientHeight - top - GAP_PX, 240)}px`;
      // Only write on a change: the content observer fires on every render below.
      if (box.style.getPropertyValue('--rail-top') !== `${top}px`) box.style.setProperty('--rail-top', `${top}px`);
      if (box.style.getPropertyValue('--rail-h') !== height) box.style.setProperty('--rail-h', height);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(box);
    // The page head appears after the route renders: watch the content too.
    const content = new MutationObserver(update);
    content.observe(box, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      content.disconnect();
    };
  }, []);
  return ref;
}
