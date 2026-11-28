import { useEffect, type RefObject } from 'react';
import { focusNode } from '@/core/lib/a11y-focus';
import type { AppTextNode } from '@ab/mobile-kit';

/** After the sheet's slide-in, so the node exists on both platforms. */
const FOCUS_DELAY_MS = 250;

/**
 * On mount, moves the reader to `ref` (a sheet's title): accessibilityViewIsModal is iOS-only,
 * so on Android the reader would otherwise stay on the screen behind the sheet.
 */
export function useFocusOnOpen(ref: RefObject<AppTextNode | null>): void {
  useEffect(() => {
    const timer = setTimeout(() => focusNode(ref.current), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ref]);
}
