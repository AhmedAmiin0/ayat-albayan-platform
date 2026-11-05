import { useEffect, useRef, useState } from 'react';
import * as Sharing from 'expo-sharing';
import { readShare, type SharedItems } from './read-share';

export type ShareRead =
  | { status: 'reading' }
  | { status: 'ready'; items: SharedItems }
  | { status: 'error' };

/**
 * The share, read once per chooser (readShare clears it natively). Plain state, not React Query:
 * the query persister would write the shared text to disk.
 */
export function useSharedItems(): ShareRead {
  const [read, setRead] = useState<ShareRead>({ status: 'reading' });
  const once = useRef<Promise<SharedItems> | null>(null);
  useEffect(() => {
    let live = true;
    once.current ??= readShare();
    once.current.then(
      (items) => live && setRead({ status: 'ready', items }),
      () => live && setRead({ status: 'error' }),
    );
    return () => {
      live = false;
    };
  }, []);
  return read;
}

/** Nowhere to share into (the assistant's tree): the share is dropped, a resume never shows it. */
export function useDropShare(): void {
  useEffect(() => {
    Sharing.clearSharedPayloads();
  }, []);
}
