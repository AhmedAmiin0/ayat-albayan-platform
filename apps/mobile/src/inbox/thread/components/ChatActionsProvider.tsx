import { canReact, formatPhone, sessionWindowOpen, type MessageView, type ThreadView } from '@ab/shared';
import { type ReactNode, useMemo, useState } from 'react';
import { ltr } from '@/core/ui/primitives/Ltr';
import { type ChatActions, ChatActionsContext, type ChatNoticeValue } from '../hooks/chat-actions';
import { CopySheet } from '../../messages/copy-download/CopySheet';
import { ForwardSheet } from './ForwardSheet';
import type { CopyRequest } from '../../messages/copy-download/chat-tools';
import { MessageMenu } from '../../messages/components/MessageMenu';
import { ReactorsSheet } from '../../messages/reactions/ReactorsSheet';
import { useReact } from '../../messages/reactions/use-react';
import { EmojiSheet } from '../../composer/emoji/EmojiSheet';
import { isOwnThread, useThreadMode } from '../hooks/thread-mode';

export interface ChatActionsProviderProps {
  phone: string;
  thread: ThreadView | null;
  children: ReactNode;
}

/**
 * «رد» and «إعادة توجيه» (owner 2026-10-25), «نسخ» (2026-10-26) and «تفاعل» (2026-10-27) for one open
 * chat. The state lives with the chat screen, so leaving the chat drops the reply target. The menu (with
 * the reaction row), the forward, copy, emoji and reactors sheets are drawn once here, not per bubble.
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
  const { mutate: reactNow } = useReact(phone, (text) => say({ text }));
  const own = isOwnThread(mode, thread);
  const canSend = !own && sessionWindowOpen(thread?.last_inbound_at ?? null, new Date());
  const threadName = thread?.display_name ?? (phone ? ltr(formatPhone(phone)) : null);
  const value = useMemo<ChatActions>(
    () => ({
      enabled: mode.kind === 'admin',
      reply,
      setReply,
      canSend,
      threadName,
      openMenu: (m, at) => setMenu({ m, at: at ?? null }),
      openForward: setForward,
      showCopy: setCopy,
      notice,
      say,
      // The window as of now (canSend), not as of the last fetch.
      reactable: (m) => mode.kind === 'admin' && canSend && canReact(m, { reactable: thread?.reactable, session_open: true }, new Date()),
      react: (m, emoji) => reactNow({ message: m, emoji }),
      openReactors: setReactors,
    }),
    [mode.kind, reply, canSend, threadName, notice, thread?.reactable, reactNow],
  );
  const removable = reactors !== null && value.reactable(reactors);
  return (
    <ChatActionsContext.Provider value={value}>
      {children}
      <MessageMenu message={menu?.m ?? null} at={menu?.at ?? null} phone={phone} onClose={() => setMenu(null)} onMoreEmoji={setEmojiFor} />
      <ForwardSheet phone={phone} message={forward} onClose={() => setForward(null)} />
      <CopySheet request={copy} onClose={() => setCopy(null)} />
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
