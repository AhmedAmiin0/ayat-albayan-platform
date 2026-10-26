import { useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/** «انسخ الرابط» on the sales pages: navigator.clipboard, and whether it worked. */
export function useCopy(): [CopyState, (text: string) => Promise<void>] {
  const [state, setState] = useState<CopyState>('idle');
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      // Clipboard blocked (http, old browser): the URL stays on screen to copy by hand.
      setState('failed');
    }
  };
  return [state, copy];
}
