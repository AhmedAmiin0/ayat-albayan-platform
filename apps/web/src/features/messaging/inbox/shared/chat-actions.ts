import type { MessageQuote, MessageView } from '@ab/shared';
import { createContext, useContext } from 'react';

// «رد» and «إعادة توجيه» (owner 2026-10-25): what the open chat's bubbles and its composer share.
// ChatActionsProvider (ThreadPane) fills it; a bubble outside a chat gets the default: no actions.

export interface ChatActions {
  /** The bubbles offer the actions: a chat she can write in (admin, sales), not teacher mode. */
  enabled: boolean;
  /** Who an inbound quote names: the chat's name (null: its number). */
  chat: { name: string | null; phone: string };
  /** Why «رد» is off now (the closed 24 h window, inbox.sessionClosed); null while it is on. */
  replyBlocked: string | null;
  /** The message the next send answers; null when none (or while the window is closed). */
  target: MessageQuote | null;
  reply: (m: MessageView) => void;
  /** ✕, or a send that answered `id`: only clears while that one is still the target. */
  cancelReply: (id?: string) => void;
  forward: (m: MessageView) => void;
  /** The quoted original is older than the loaded pages: say so. */
  notLoaded: () => void;
  /** «تفاعل» (owner 2026-10-27): this bubble's menu offers the emoji row (canReact). */
  reactable: (m: MessageView) => boolean;
  /** Ours on `m` (null removes it): optimistic, one send. */
  react: (m: MessageView, emoji: string | null) => void;
}

const noop = () => undefined;

export const ChatActionsContext = createContext<ChatActions>({
  enabled: false,
  chat: { name: null, phone: '' },
  replyBlocked: null,
  target: null,
  reply: noop,
  cancelReply: noop,
  forward: noop,
  notLoaded: noop,
  reactable: () => false,
  react: noop,
});

export const useChatActions = (): ChatActions => useContext(ChatActionsContext);
