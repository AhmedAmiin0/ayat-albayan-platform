import { staffMaySend, triesAfterWindow, type ChatSendState } from '@ab/client-core';
import type { ThreadView } from '@ab/shared';
import { useInboxMode } from './mode';

type SendThread = Pick<ThreadView, 'session_open' | 'try_after_window'>;

const stateOf = (thread: SendThread): ChatSendState => ({
  open: thread.session_open,
  tryAfterWindow: thread.try_after_window,
});

/**
 * May a send go from this chat now (owner 2026-11-01, «do the same as the messages»): the text
 * rule for a reply, a quote, a payment link, a file and a forward. Teacher mode never tries after
 * the window (docs/19).
 */
export function useMaySend(thread: SendThread): boolean {
  return staffMaySend(stateOf(thread), useInboxMode() !== 'teacher');
}

/** Tried after the window: the composer's «try» note instead of «send a template». */
export function useTriesAfterWindow(thread: SendThread): boolean {
  return triesAfterWindow(stateOf(thread), useInboxMode() !== 'teacher');
}
