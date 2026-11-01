/**
 * Ref callbacks for one-time DOM work when a node mounts (docs/32 x2: no effect needed).
 * They live at module level, so their identity never changes and React calls each one once
 * per mounted node (and with `null` when it unmounts), exactly when a `[]` effect ran before.
 */

/** Moves keyboard focus to the node as it appears (a heading or status line with tabIndex -1). */
export function focusOnMount(node: HTMLElement | null): void {
  node?.focus();
}

/** Old engines and jsdom ship elements without `scrollIntoView`. */
const canScroll = (node: HTMLElement | null): node is HTMLElement =>
  node !== null && 'scrollIntoView' in node;

/** Scrolls the node into view as it appears (a notice under a tall grid, drawers, phones). */
export function revealOnMount(node: HTMLElement | null): void {
  if (canScroll(node)) node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
