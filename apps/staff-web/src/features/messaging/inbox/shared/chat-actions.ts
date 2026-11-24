import type { MessageQuote, MessageView } from '@ab/shared';
import { createContext, useContext } from 'react';

// A bubble outside a chat gets the default: no actions.

export interface ChatActions {
  /** The bubbles offer the actions: a chat she can write in (admin, sales), not teacher mode. */
  enabled: boolean;
  /** Who an inbound quote names: the chat's name (null: its number). */
  chat: { name: string | null; phone: string };
  /** Null while reply is allowed; otherwise the closed 24 h window notice. */
  replyBlocked: string | null;
  /** The message the next send answers; null when none (or while the window is closed). */
  target: MessageQuote | null;
  reply: (m: MessageView) => void;
  /** ✕, or a send that answered `id`: only clears while that one is still the target. */
  cancelReply: (id?: string) => void;
  /** The message the next text corrects with a new reply (WhatsApp cannot edit); null when none. */
  editing: MessageView | null;
  /** This edit tap's session, carried by its sends; null when none. */
  editSession: string | null;
  edit: (m: MessageView) => void;
  /** ✕, or a sent correction of `session`: only ends that very edit, never a newer one. */
  cancelEdit: (session?: string) => void;
  forward: (m: MessageView) => void;
  /** The quoted original is older than the loaded pages: say so. */
  notLoaded: () => void;
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
  editing: null,
  editSession: null,
  edit: noop,
  cancelEdit: noop,
  forward: noop,
  notLoaded: noop,
  reactable: () => false,
  react: noop,
});

export const useChatActions = (): ChatActions => useContext(ChatActionsContext);
