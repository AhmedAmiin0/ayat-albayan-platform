import { mergeChat, type CallView, type MessageView } from '@ab/shared';

/** One row of the chat's list: a message, or a call merged in by its time (docs/28 §5). */
export interface LogRow {
  id: string;
  direction: MessageView['direction'];
  /** When it happened (a call's start), for the day chips. */
  created_at: string;
  message?: MessageView;
  call?: CallView;
}

/**
 * The inverted list's rows, newest first: the loaded messages (oldest → newest) with the chat's calls
 * merged in by time. While older pages are not loaded, a call before the oldest message waits for them.
 */
export function logRows(messages: readonly MessageView[], input: { calls: readonly CallView[]; hasMore: boolean }): LogRow[] {
  const from = input.hasMore ? (messages[0]?.created_at ?? null) : null;
  return mergeChat(messages, input.calls, { from })
    .map((e): LogRow => (e.kind === 'message' ? { id: e.message.id, direction: e.message.direction, created_at: e.at, message: e.message } : { id: e.call.id, direction: e.call.direction, created_at: e.at, call: e.call }))
    .reverse();
}
