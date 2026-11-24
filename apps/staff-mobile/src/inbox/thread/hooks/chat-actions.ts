import type { MessageView } from '@ab/shared';
import { createContext, type Dispatch, type SetStateAction, useContext } from 'react';
import type { CopyRequest } from '@/inbox/messages/copy-download/chat-tools';

// Without a provider every action is off.

/** A short line over the composer: why a jump failed, what a forward did. */
export interface ChatNoticeValue {
  text: string;
  /** Lines under it (each skipped chat and why); a notice with details stays until closed. */
  details?: string[];
}

export interface ChatActions {
  /** Admin and sales chats only. */
  enabled: boolean;
  /** The message the next text or file answers. */
  reply: MessageView | null;
  setReply: Dispatch<SetStateAction<MessageView | null>>;
  /** Never set together with a reply. */
  editing: MessageView | null;
  /** Null when there is no edit session. */
  editSession: string | null;
  /** Starts the correction: the box holds its text, any reply is dropped. */
  startEdit: (m: MessageView) => void;
  /** ✕ on the edit bar: the box gets back its draft from before the edit. */
  cancelEdit: () => void;
  /** Ends only that session's edit, never a newer one. */
  editSent: (session: string) => void;
  /** True inside the 24 h window on a writable chat. */
  canSend: boolean;
  /** Who an inbound quote is from: the chat's name, else its number. */
  threadName: string | null;
  /** The long-press menu; `at` = the held bubble's window y (the reaction row floats above it). */
  openMenu: (m: MessageView, at?: number) => void;
  openForward: (m: MessageView) => void;
  showCopy: (req: CopyRequest) => void;
  notice: ChatNoticeValue | null;
  say: (notice: ChatNoticeValue | null) => void;
  /** Staff chats only (canReact). */
  reactable: (m: MessageView) => boolean;
  /** Ours on `m` (null removes it): optimistic, one send. */
  react: (m: MessageView, emoji: string | null) => void;
  /** A tap on the pill: who reacted. */
  openReactors: (m: MessageView) => void;
  openFailed: (m: MessageView) => void;
}

const noop = () => undefined;
export const ChatActionsContext = createContext<ChatActions>({
  enabled: false,
  reply: null,
  setReply: noop,
  editing: null,
  editSession: null,
  startEdit: noop,
  cancelEdit: noop,
  editSent: noop,
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
  openFailed: noop,
});

export const useChatActions = (): ChatActions => useContext(ChatActionsContext);

/** The part a bubble reads: none of it changes when a reply is picked or a notice shows. */
export type BubbleChatActions = Pick<
  ChatActions,
  | 'enabled'
  | 'canSend'
  | 'setReply'
  | 'threadName'
  | 'openMenu'
  | 'openForward'
  | 'showCopy'
  | 'reactable'
  | 'react'
  | 'openReactors'
  | 'openFailed'
>;

/** A separate slice so picking a reply or a notice does not rerender every bubble. */
export const BubbleActionsContext = createContext<BubbleChatActions>({
  enabled: false,
  canSend: false,
  setReply: noop,
  threadName: null,
  openMenu: noop,
  openForward: noop,
  showCopy: noop,
  reactable: () => false,
  react: noop,
  openReactors: noop,
  openFailed: noop,
});

export const useBubbleChatActions = (): BubbleChatActions => useContext(BubbleActionsContext);
