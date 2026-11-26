import { onlineManager } from '@tanstack/react-query';
import type { DraftStore, SubscribeResume } from './draft.types';

/**
 * Autosave skips a body the server already has (shouldSave). A press on «save draft» always
 * sends, so the teacher sees it saved, and a body that just failed goes again at once.
 */
export const savesNow = (s: { enabled: boolean; pending: boolean }): boolean =>
  s.enabled && !s.pending;

export const subscribeOnline: SubscribeResume = (listener) =>
  onlineManager.subscribe((online) => {
    if (online) listener();
  });

const settled = (): Promise<void> => Promise.resolve();

/** No device copy: the web keeps the body in the open form only. */
export const NO_STORE: DraftStore = { keep: settled, drop: settled, dropIfRefused: settled };
