import type { MessageView } from '@ab/shared';
import { createContext, type Dispatch, type SetStateAction, useContext } from 'react';
import type { CopyRequest } from '../../messages/copy-download/chat-tools';

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
  /** The long-press menu; `at` = the held bubble's window y (the reaction row floats above it). */
  openMenu: (m: MessageView, at?: number) => void;
  openForward: (m: MessageView) => void;
  /** «نسخ النص» / «نسخ الرقم»: the selectable copy sheet (chat-tools). */
  showCopy: (req: CopyRequest) => void;
  notice: ChatNoticeValue | null;
  say: (notice: ChatNoticeValue | null) => void;
  /** «تفاعل» (owner 2026-10-27): this bubble offers the reaction row (canReact, staff chats only). */
  reactable: (m: MessageView) => boolean;
  /** Ours on `m` (null removes it): optimistic, one send. */
  react: (m: MessageView, emoji: string | null) => void;
  /** A tap on the pill: who reacted. */
  openReactors: (m: MessageView) => void;
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
  showCopy: noop,
  notice: null,
  say: noop,
  reactable: () => false,
  react: noop,
  openReactors: noop,
});

export const useChatActions = (): ChatActions => useContext(ChatActionsContext);
