import { useEffect, type RefObject } from 'react';

/**
 * After a failed submit (`problem` set): scroll to the first field marked aria-invalid inside
 * `root` and focus it (a radio group → its first radio), so the teacher lands on what is missing
 * instead of a message at the bottom of a long page.
 */
export function useFocusInvalid(root: RefObject<HTMLElement | null>, problem: string | null): void {
  useEffect(() => {
    if (!problem) return;
    const bad = root.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!bad) return;
    bad.scrollIntoView?.({ block: 'center' });
    const target = bad instanceof HTMLFieldSetElement ? bad.querySelector<HTMLElement>('input') : bad;
    target?.focus({ preventScroll: true });
  }, [root, problem]);
}
