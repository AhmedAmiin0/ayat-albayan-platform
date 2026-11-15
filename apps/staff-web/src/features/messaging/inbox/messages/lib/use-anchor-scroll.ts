import { useLayoutEffect, useRef, type RefObject } from 'react';
import { jumpToMessage } from './jump-to-message';

/** The log shows the window around a search hit (docs/37 NEW 3) instead of the live chat. */
export interface LogAnchor {
  /** The hit the window opened around. */
  id: string;
  /** «الانتقال إلى أحدث رسالة»: back to the live chat. */
  onNewest: () => void;
}

interface AnchorScroll {
  boxRef: RefObject<HTMLDivElement | null>;
  /** The log follows new rows (at the bottom, not scrolled up). */
  pinnedRef: RefObject<boolean>;
  /** The newest row's id and whether it is her own send (it always snaps down). */
  newest: string | undefined;
  own: boolean;
  anchor: LogAnchor | undefined;
  /** The window's rows have rendered (the hit is in the log). */
  shows: (id: string) => boolean;
}

const toBottom = (boxRef: RefObject<HTMLDivElement | null>, pinnedRef: RefObject<boolean>) => {
  const box = boxRef.current;
  if (box) box.scrollTop = box.scrollHeight;
  pinnedRef.current = true;
};

/**
 * The log's scroll (owner 2026-10-05, docs/37): live, it opens at the newest message and stays
 * pinned there as rows arrive unless the reader scrolled up; her own send always snaps down.
 * Anchored, it never pins: it scrolls to and flashes the hit once the window renders; leaving
 * the window pins it to the newest message again.
 */
export function useAnchorScroll(o: AnchorScroll): void {
  const { boxRef, pinnedRef, newest, own, anchor, shows } = o;
  const id = anchor?.id;
  const flashed = useRef<string | undefined>(undefined);
  const wasAnchored = useRef(id !== undefined);
  // Only a new newest row (or it turning out to be hers) moves the reader, never a status change.
  useLayoutEffect(() => {
    const follow = id === undefined && (pinnedRef.current || own);
    if (follow) toBottom(boxRef, pinnedRef);
  }, [newest, own, id, boxRef, pinnedRef]);
  useLayoutEffect(() => {
    const due = id !== undefined && flashed.current !== id && shows(id);
    if (!due) return;
    flashed.current = id;
    pinnedRef.current = false;
    jumpToMessage(id, false);
  });
  // Back from a window: the live chat opens at its newest message.
  useLayoutEffect(() => {
    const left = wasAnchored.current && id === undefined;
    wasAnchored.current = id !== undefined;
    flashed.current = id === undefined ? undefined : flashed.current;
    if (left) toBottom(boxRef, pinnedRef);
  }, [id, boxRef, pinnedRef]);
}
