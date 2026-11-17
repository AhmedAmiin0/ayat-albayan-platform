import type { ChannelPage } from '@ab/shared';
import { useState } from 'react';

/** The mark once known: `at` null when she never read here (or a monitor). */
interface Captured {
  at: string | null;
}

/**
 * The viewer's read mark as the first page gave it when the chat opened (null while it loads):
 * kept once, so the band stays where it was while she reads and the mark moves on, as WhatsApp's.
 */
export function useOpeningReadMark(pages: readonly ChannelPage[] | undefined): string | null {
  const [mark, setMark] = useState<Captured | undefined>(undefined);
  const first = pages?.[0];
  if (mark === undefined && first) setMark({ at: first.my_last_read_at });
  return mark?.at ?? null;
}
