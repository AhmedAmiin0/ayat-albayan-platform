import type { MouseEvent } from 'react';

/** Plain left click → client-side navigation; ctrl / cmd / shift / middle click keep the browser's. */
export function isPlainClick(e: Pick<MouseEvent, 'button' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'>): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
