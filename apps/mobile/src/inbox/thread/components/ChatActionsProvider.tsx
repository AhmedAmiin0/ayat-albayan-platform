import { staffMaySend } from '@ab/client-core';
import { canReact, formatPhone, type MessageView, type ThreadView } from '@ab/shared';
import { type ReactNode, useMemo, useState } from 'react';
import { ltr } from '@/core/ui/primitives/Ltr';
import {
  BubbleActionsContext,
  type BubbleChatActions,
  type ChatActions,
  ChatActionsContext,
  type ChatNoticeValue,
} from '@/inbox/thread/hooks/chat-actions';
import { CopySheet } from '@/inbox/messages/copy-download/CopySheet';
import { ForwardSheet } from './ForwardSheet';
import type { CopyRequest } from '@/inbox/messages/copy-download/chat-tools';
import { MessageMenu } from '@/inbox/messages/components/MessageMenu';
import { FailedSheet } from '@/inbox/messages/resend/FailedSheet';
import { ReactorsSheet } from '@/inbox/messages/reactions/ReactorsSheet';
import { useReact } from '@/inbox/messages/reactions/use-react';
import { EmojiSheet } from '@/inbox/composer/emoji/EmojiSheet';
import { isOwnThread, useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { sendState } from '@/inbox/thread/hooks/chat-window';

export interface ChatActionsProviderProps {
  phone: string;
  thread: ThreadView | null;
  children: ReactNode;
}

/**
 * «رد» and «إعادة توجيه» (owner 2026-10-25), «نسخ» (2026-10-26) and «تفاعل» (2026-10-27) for one open
 * chat. The state lives with the chat screen, so leaving the chat drops the reply target. The menu (with
 * the reaction row), the forward, copy, emoji, reactors and failed-send sheets are drawn once here, not per bubble.
 */
export function ChatActionsProvider({ phone, thread, children }: ChatActionsProviderProps) {
  const mode = useThreadMode();
  const [reply, setReply] = useState<MessageView | null>(null);
  const [menu, setMenu] = useState<{ m: MessageView; at: number | null } | null>(null);
  const [forward, setForward] = useState<MessageView | null>(null);
  const [copy, setCopy] = useState<CopyRequest | null>(null);
  const [notice, say] = useState<ChatNoticeValue | null>(null);
  const [reactors, setReactors] = useState<MessageView | null>(null);
  const [emojiFor, setEmojiFor] = useState<MessageView | null>(null);
  const [failed, setFailed] = useState<MessageView | null>(null);
  const { mutate: reactNow } = useReact(phone, (text) => say({ text }));
  const own = isOwnThread(mode, thread);
  const chat = sendState(thread, new Date());
  // «رد» follows the text rule (owner 2026-11-01); a reaction keeps the window.
  const canSend = !own && staffMaySend(chat, mode.kind !== 'teacher');
  const windowOpen = !own && chat.open;
  const threadName = thread?.display_name ?? (phone ? ltr(formatPhone(phone)) : null);
  const enabled = mode.kind === 'admin';
  const reactableNow = thread?.reactable;
  // Setters and the react mutation are stable: the bubbles' value changes only with the mode, the 24 h
  // window, the name or whether the chat takes reactions; picking «رد» or a notice leaves it alone.
  const bubble = useMemo<BubbleChatActions>(
    () => ({
      enabled,
      canSend,
      setReply,
      threadName,
      openMenu: (m, at) => setMenu({ m, at: at ?? null }),
      openForward: setForward,
      showCopy: setCopy,
      // The window as of now (windowOpen), not as of the last fetch.
      reactable: (m) => enabled && windowOpen && canReact(m, { reactable: reactableNow, session_open: true }, new Date()),
      react: (m, emoji) => reactNow({ message: m, emoji }),
      openReactors: setReactors,
      openFailed: setFailed,
    }),
    [enabled, canSend, windowOpen, threadName, reactableNow, reactNow],
  );
  const value = useMemo<ChatActions>(() => ({ ...bubble, reply, notice, say }), [bubble, reply, notice]);
  const removable = reactors !== null && value.reactable(reactors);
  return (
    <ChatActionsContext.Provider value={value}>
      <BubbleActionsContext.Provider value={bubble}>{children}</BubbleActionsContext.Provider>
      <MessageMenu message={menu?.m ?? null} at={menu?.at ?? null} phone={phone} onClose={() => setMenu(null)} onMoreEmoji={setEmojiFor} />
      <ForwardSheet phone={phone} message={forward} onClose={() => setForward(null)} />
      <CopySheet request={copy} onClose={() => setCopy(null)} />
      <FailedSheet phone={phone} message={failed} onClose={() => setFailed(null)} onError={(text) => say({ text })} />
      <ReactorsSheet message={reactors} contact={threadName} onRemove={removable ? (m) => value.react(m, null) : undefined} onClose={() => setReactors(null)} />
      <EmojiSheet
        visible={emojiFor !== null}
        onPick={(e) => {
          if (emojiFor) value.react(emojiFor, e);
          setEmojiFor(null);
        }}
        onClose={() => setEmojiFor(null)}
      />
    </ChatActionsContext.Provider>
  );
}
