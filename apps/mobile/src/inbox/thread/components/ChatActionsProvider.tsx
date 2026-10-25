import { formatPhone, sessionWindowOpen, type MessageView, type ThreadView } from '@ab/shared';
import { type ReactNode, useMemo, useState } from 'react';
import { ltr } from '@/core/ui/primitives/Ltr';
import { type ChatActions, ChatActionsContext, type ChatNoticeValue } from '../hooks/chat-actions';
import { ForwardSheet } from './ForwardSheet';
import { MessageMenu } from '../../MessageMenu';
import { isOwnThread, useThreadMode } from '../hooks/thread-mode';

export interface ChatActionsProviderProps {
  phone: string;
  thread: ThreadView | null;
  children: ReactNode;
}

/**
 * «رد» and «إعادة توجيه» (owner 2026-10-25) for one open chat. The state lives with the chat screen, so
 * leaving the chat drops the reply target. The menu and the forward sheet are drawn once here, not per bubble.
 */
export function ChatActionsProvider({ phone, thread, children }: ChatActionsProviderProps) {
  const mode = useThreadMode();
  const [reply, setReply] = useState<MessageView | null>(null);
  const [menu, setMenu] = useState<MessageView | null>(null);
  const [forward, setForward] = useState<MessageView | null>(null);
  const [notice, say] = useState<ChatNoticeValue | null>(null);
  const canSend =
    !isOwnThread(mode, thread) && sessionWindowOpen(thread?.last_inbound_at ?? null, new Date());
  const threadName = thread?.display_name ?? (phone ? ltr(formatPhone(phone)) : null);
  const value = useMemo<ChatActions>(
    () => ({
      enabled: mode.kind === 'admin',
      reply,
      setReply,
      canSend,
      threadName,
      openMenu: setMenu,
      openForward: setForward,
      notice,
      say,
    }),
    [mode.kind, reply, canSend, threadName, notice],
  );
  return (
    <ChatActionsContext.Provider value={value}>
      {children}
      <MessageMenu message={menu} onClose={() => setMenu(null)} />
      <ForwardSheet phone={phone} message={forward} onClose={() => setForward(null)} />
    </ChatActionsContext.Provider>
  );
}
