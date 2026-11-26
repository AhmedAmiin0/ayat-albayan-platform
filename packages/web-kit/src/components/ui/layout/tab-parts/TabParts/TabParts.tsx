/**
 * An unread badge on a tab (the family app's pill Badge): a small green pill after the word. The
 * tab's `ariaLabel` already says it, so the digits are hidden from assistive tech.
 */
export function TabBadge({ count }: { count: number }) {
  return (
    <span
      aria-hidden="true"
      className="ms-1.5 inline-grid h-4 min-w-4 place-items-center rounded-full bg-lapis-fill
        px-1 text-[11px] font-bold leading-none text-primary-foreground tabular-nums"
    >
      {count}
    </span>
  );
}

/**
 * A ref for the selected tab of a strip that scrolls sideways (a phone's child tabs): when a tab
 * becomes the selected one, the strip scrolls it to its middle. Only the strip moves, never the
 * page (RTL or LTR alike: the scroll is by the measured offset).
 */
export function keepInStrip(tab: HTMLElement | null): void {
  const strip = tab?.parentElement;
  if (!tab || !strip || typeof strip.scrollBy !== 'function') return;
  const at = tab.getBoundingClientRect();
  const box = strip.getBoundingClientRect();
  strip.scrollBy({ left: at.left + at.width / 2 - (box.left + box.width / 2) });
}
