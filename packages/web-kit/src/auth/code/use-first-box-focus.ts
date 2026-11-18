import { type RefObject, useLayoutEffect } from 'react';

/**
 * The boxes replaced the form (or the refused boxes) that had the focus: start in the first box
 * (and its autofill) in the same commit. A passive effect left a tick where the removed box's focus
 * sat on <body>, so a quick refusal could find the page with no box focused.
 */
export function useFirstBoxFocus(refs: RefObject<(HTMLInputElement | null)[]>) {
  useLayoutEffect(() => refs.current[0]?.focus(), [refs]);
}
