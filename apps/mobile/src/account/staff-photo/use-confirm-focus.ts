import { useEffect, useRef } from 'react';
import type { View } from 'react-native';
import { focusNode } from '@/core/lib/a11y-focus';

/** After the confirm strip mounts, so its native node exists on both platforms. */
const FOCUS_DELAY_MS = 100;

/**
 * Screen-reader focus for an inline confirm: on open it moves to the confirm button (`confirm`), on
 * cancel or confirm it returns to the button that opened it (`back`). Never on the first render.
 */
export function useConfirmFocus(confirming: boolean) {
  const confirm = useRef<View>(null);
  const back = useRef<View>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (!confirming && !opened.current) return undefined;
    opened.current = true;
    const target = confirming ? confirm : back;
    const timer = setTimeout(() => focusNode(target.current), FOCUS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [confirming]);
  return { confirm, back };
}
