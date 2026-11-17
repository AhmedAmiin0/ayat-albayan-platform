import { useEffect, useState } from 'react';
import type { ChannelRef } from '../channel-api';
import { readMarkOf } from './read-mark';

/**
 * The read mark as it was when the chat opened (undefined while it loads): read once, so the band
 * stays where it was while she reads, as WhatsApp's.
 */
export function useOpeningReadMark(ref: ChannelRef): string | null | undefined {
  const [mark, setMark] = useState<string | null | undefined>(undefined);
  const { audience, studentId } = ref;
  useEffect(() => {
    let live = true;
    void readMarkOf({ audience, studentId }).then((at) => {
      if (live) setMark(at);
    });
    return () => {
      live = false;
    };
  }, [audience, studentId]);
  return mark;
}
