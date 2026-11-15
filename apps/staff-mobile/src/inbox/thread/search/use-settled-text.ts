import { CHAT_SEARCH_DEBOUNCE_MS } from '@ab/client-core';
import { useEffect, useRef, useState } from 'react';

/**
 * The typed words once typing pauses (CHAT_SEARCH_DEBOUNCE_MS): `settle` on every change, the
 * search asks only for `settled`. The pending timer goes with the chat.
 */
export function useSettledText() {
  const [settled, setSettled] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const settle = (text: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSettled(text.trim()), CHAT_SEARCH_DEBOUNCE_MS);
  };
  const reset = () => {
    clearTimeout(timer.current);
    setSettled('');
  };
  return { settled, settle, reset };
}
