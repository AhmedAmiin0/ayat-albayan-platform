import { useEffect, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle } from 'react-native';
import type { AppTextNode } from '@/core/ui/primitives/AppText';

/** After the sheet's slide-in, so the node exists on both platforms. */
const FOCUS_DELAY_MS = 250;

/** Moves screen-reader focus to the node, if it has one; never throws (an old OS, a gone node). */
export function focusNode(target: AppTextNode | null): boolean {
  if (target === null) return false;
  try {
    const node = findNodeHandle(target);
    if (node === null) return false;
    AccessibilityInfo.setAccessibilityFocus(node);
    return true;
  } catch {
    return false;
  }
}

/**
 * On mount, puts TalkBack/VoiceOver on `ref` (a sheet's title): accessibilityViewIsModal is iOS-only,
 * so on Android the reader would otherwise stay on the screen behind the sheet.
 */
export function useFocusOnOpen(ref: RefObject<AppTextNode | null>): void {
  useEffect(() => {
    const timer = setTimeout(() => focusNode(ref.current), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [ref]);
}
