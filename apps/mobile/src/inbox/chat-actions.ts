import type { MessageView } from '@ab/shared';
import { createContext, type Dispatch, type SetStateAction, useContext } from 'react';

// One open chat's «رد» / «إعادة توجيه» state (ChatActionsProvider). Without a provider: all off.

/** A short line over the composer: why a jump failed, what a forward did. */
export interface ChatNoticeValue {
  text: string;
  /** Lines under it (each skipped chat and why); a notice with details stays until closed. */
  details?: string[];
}

export interface ChatActions {
  /** Long press, swipe, «رد» and «إعادة توجيه» are offered (admin and sales chats only). */
  enabled: boolean;
  /** The message the next text or file answers. */
  reply: MessageView | null;
  setReply: Dispatch<SetStateAction<MessageView | null>>;
  /** Free text can go out now (24 h window, not a read-only chat): «رد» is usable. */
  canSend: boolean;
  /** Who an inbound quote is from: the chat's name, else its number. */
  threadName: string | null;
  openMenu: (m: MessageView) => void;
  openForward: (m: MessageView) => void;
  notice: ChatNoticeValue | null;
  say: (notice: ChatNoticeValue | null) => void;
}

const noop = () => undefined;
export const ChatActionsContext = createContext<ChatActions>({
  enabled: false,
  reply: null,
  setReply: noop,
  canSend: false,
  threadName: null,
  openMenu: noop,
  openForward: noop,
  notice: null,
  say: noop,
});

export const useChatActions = (): ChatActions => useContext(ChatActionsContext);
