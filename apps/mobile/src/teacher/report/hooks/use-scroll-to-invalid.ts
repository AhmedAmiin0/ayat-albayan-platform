import { useEffect, useState, type RefObject } from 'react';
import type { ScrollView, View } from 'react-native';

/**
 * After a failed send (`problem` set): scrolls the form's ScrollView to the first invalid question
 * (`firstInvalid` = the key its `register` was registered under), so the teacher does not have to
 * hunt for it in a long page. Without a ScrollView (tests, a single card) it does nothing.
 */
export function useScrollToInvalid(scroll: RefObject<ScrollView | null> | undefined, opts: { problem: string | null; firstInvalid: string | null }) {
  // A Map in state (not a ref): the card hands `register(key)` to its questions while rendering.
  const [fields] = useState(() => new Map<string, View | null>());
  const register = (key: string) => (node: View | null) => {
    fields.set(key, node);
  };
  const { problem, firstInvalid } = opts;
  useEffect(() => {
    const view = scroll?.current;
    const field = firstInvalid ? fields.get(firstInvalid) : null;
    const inner = view?.getInnerViewNode?.();
    if (!problem || !view || !field || inner == null) return;
    field.measureLayout?.(inner, (_x, y) => view.scrollTo({ y: Math.max(0, y - 16), animated: true }), () => undefined);
  }, [scroll, fields, problem, firstInvalid]);
  return register;
}
