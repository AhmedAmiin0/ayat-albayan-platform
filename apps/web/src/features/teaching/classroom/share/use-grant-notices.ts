import { useEffect, useRef } from 'react';
import { REQUEST_TEXT } from './request-text';
import type { RequestKind, ShareInput, ShareState } from './share-messages';

export interface GrantFlags {
  /** LiveKit lets me publish a screen (a staff «سماح» via UpdateParticipant). */
  screen: boolean;
  /** The board lets me draw (my name in `allowed`, or every student may). */
  draw: boolean;
  /** The staff opened the board. */
  open: boolean;
}

interface Options {
  flags: GrantFlags;
  mine: ShareState['mine'];
  dispatch: (input: ShareInput) => void;
  setNotice: (notice: string | null) => void;
}

const KINDS: readonly RequestKind[] = ['screen', 'draw', 'open'];

/**
 * Guest side: a permission flipping on is the «سماح» itself. It ends my request of that kind and
 * says «سُمح لك…» (for the screen always, as before; for the board only when I had asked). A
 * permission taken away («إيقاف مشاركة» / «إيقاف كتابة») clears the line that no longer holds.
 */
export function useGrantNotices({ flags, mine, dispatch, setNotice }: Options): void {
  const before = useRef(flags);
  const asked = useRef(mine);
  useEffect(() => {
    asked.current = mine;
  }, [mine]);
  const { screen, draw, open } = flags;
  useEffect(() => {
    const now: GrantFlags = { screen, draw, open };
    for (const what of KINDS) {
      const was = before.current[what];
      if (now[what] && !was) {
        if (what === 'screen' || asked.current[what] === 'pending') setNotice(REQUEST_TEXT[what].allowed);
        dispatch({ kind: 'granted', what });
      }
      if (!now[what] && was && what !== 'open') setNotice(null);
    }
    before.current = now;
  }, [screen, draw, open, dispatch, setNotice]);
}
