import type { Locator } from '@playwright/test';

// Waits out an element's entrance (fade-up on phones, drawer-in / pop-in from 640px) so its box is
// read at rest, not mid-transform. A string: the e2e tsconfig has no DOM lib. Infinite animations
// (skeleton shimmer) are skipped.
const SETTLE =
  '(el) => Promise.all(el.getAnimations({ subtree: true })' +
  '.filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished)).then(() => null)';

/** Resolves once the element's own (and its children's) finite animations have finished. */
export const settled = (el: Locator): Promise<null> => el.evaluate(SETTLE);

/** The element's box after its entrance animation (null when it is not rendered). */
export async function restingBox(el: Locator) {
  await settled(el);
  return el.boundingBox();
}
