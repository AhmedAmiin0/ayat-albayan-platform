import { useEffect, useState } from 'react';

const NOTICE_MS = 5000;

/** Held by the screen, since a cancelled lesson's card leaves and its notice must not. */
export function useTimedNotice() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (text === null) return undefined;
    const id = setTimeout(() => setText(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [text]);
  return { text, show: setText };
}
