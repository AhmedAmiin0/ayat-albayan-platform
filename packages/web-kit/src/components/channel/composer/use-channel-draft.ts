import { useState } from 'react';
import { readDraft, writeDraft } from './draft-store';

/** The composer's text for one chat, read from and written through to its draft (draft-store). */
export function useChannelDraft(key: string) {
  const [text, setText] = useState(() => readDraft(key));
  const set = (next: string | ((current: string) => string)) => {
    setText((current) => {
      const value = typeof next === 'function' ? next(current) : next;
      writeDraft(key, value);
      return value;
    });
  };
  return [text, set] as const;
}
