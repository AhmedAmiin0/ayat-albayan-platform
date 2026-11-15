import { AccessibilityInfo, findNodeHandle, type Text, type View } from 'react-native';

/** Moves screen-reader focus to the node, if it has one; never throws (an old OS, a gone node). */
export function focusNode(target: Text | View | null): boolean {
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
