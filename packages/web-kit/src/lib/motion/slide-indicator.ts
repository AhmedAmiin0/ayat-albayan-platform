// A selection indicator that slides between choices (motion.css `.ab-indicator`): the tab bar's
// tile, the week strip's ring. One `data-indicator-host` element (positioned) holds the choices and
// ONE `data-indicator` element; the selected choice gets `ref={followSelected}`. The offsets are
// physical (offsetLeft / offsetTop), so the indicator sits at the host's top-left in both
// directions and RTL needs nothing more. No effect and no state: the ref callback places it.

const raf = (run: () => void): void => {
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else run();
};

/** Puts `indicator` over `target` at once; it slides from the next move on (`data-placed`). */
export function placeIndicator(indicator: HTMLElement, target: HTMLElement): void {
  indicator.style.width = `${String(target.offsetWidth)}px`;
  indicator.style.height = `${String(target.offsetHeight)}px`;
  indicator.style.transform = `translate(${String(target.offsetLeft)}px, ${String(target.offsetTop)}px)`;
  indicator.hidden = false;
  if (indicator.dataset.placed === undefined) raf(() => (indicator.dataset.placed = ''));
}

/**
 * The selected choice's ref: moves its host's indicator onto it, and again whenever the host
 * resizes (a rotated phone, a longer label). A ref callback's cleanup stops the watching.
 */
export function followSelected(el: HTMLElement | null): (() => void) | undefined {
  const placing = el ? placingOf(el) : null;
  return placing ? watchHost(placing) : undefined;
}

interface Placing {
  el: HTMLElement;
  host: HTMLElement;
  bar: HTMLElement;
}

function placingOf(el: HTMLElement): Placing | null {
  const host = el.closest<HTMLElement>('[data-indicator-host]');
  const bar = host?.querySelector<HTMLElement>('[data-indicator]');
  return host && bar ? { el, host, bar } : null;
}

function watchHost({ el, host, bar }: Placing): () => void {
  const place = () => placeIndicator(bar, el);
  place();
  const watch = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
  watch?.observe(host);
  return () => watch?.disconnect();
}
