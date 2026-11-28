import { useEffect, useRef, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle, type Text, type View } from 'react-native';
import { motion } from '../../theme';

type FocusRef = RefObject<Text | View | null> | undefined;

function moveFocus(target: Text | View | null | undefined): void {
  const node = target ? findNodeHandle(target) : null;
  if (node !== null) AccessibilityInfo.setAccessibilityFocus(node);
}

/**
 * The reader lands on a sheet's title once the native slide settles and goes back to the opener
 * on close: Android's sheet is its own window, so TalkBack would otherwise stay behind it.
 */
export function useSheetFocus(open: boolean, title: FocusRef, returnFocus: FocusRef): void {
  const was = useRef(false);
  useEffect(() => {
    const moved = was.current !== open;
    was.current = open;
    const target = open ? title : returnFocus;
    const timer = setTimeout(() => moveFocus(moved ? target?.current : null), motion.base);
    return () => clearTimeout(timer);
  }, [open, title, returnFocus]);
}
