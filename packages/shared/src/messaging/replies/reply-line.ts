import type { WaLine } from '../../enums/messaging.js';
import { sessionWindowOpen } from '../wa.js';

export interface ReplyLineInput {
  /** Newest inbound received on the chat line (v_threads.last_chat_inbound_at). */
  lastChatInboundAt: string | null | undefined;
  /** Newest inbound on the notifications line or without a line (history / single line). */
  lastNotificationsInboundAt: string | null | undefined;
  /** The chat line can SEND (lineEnvs(env).chat is set). */
  chatConfigured: boolean;
  now: Date;
}

/**
 * The line a staff session text leaves from (docs/12 §13.3 rule 2; owner 2026-10-11: normal chats
 * use the chat number). Meta allows a session text only on a line whose own 24 h window is open:
 * 1. 'chat' when the chat line is configured and its window is open;
 * 2. else 'notifications' when the notifications window is open;
 * 3. else 'chat' when the chat window is the only open one but the chat line cannot send (the
 *    caller answers 503 line_not_configured: `line === 'chat' && !chatConfigured`);
 * 4. else null: every window is closed (409 session_closed).
 * With the chat line unset no inbound is stamped 'chat', so this is today's single window.
 */
export function replyLine(input: ReplyLineInput): WaLine | null {
  const chatOpen = sessionWindowOpen(input.lastChatInboundAt, input.now);
  if (chatOpen && input.chatConfigured) return 'chat';
  if (sessionWindowOpen(input.lastNotificationsInboundAt, input.now)) return 'notifications';
  return chatOpen ? 'chat' : null;
}
