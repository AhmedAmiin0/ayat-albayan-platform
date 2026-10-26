import { formatPhone, sessionWindowOpen, type MessageView, type ThreadView } from '@ab/shared';
import { type ReactNode, useMemo, useState } from 'react';
import { ltr } from '@/core/ui/primitives/Ltr';
import { type ChatActions, ChatActionsContext, type ChatNoticeValue } from '../hooks/chat-actions';
import { CopySheet } from '../../messages/copy-download/CopySheet';
import { ForwardSheet } from './ForwardSheet';
import type { CopyRequest } from '../../messages/copy-download/chat-tools';
import { MessageMenu } from '../../messages/components/MessageMenu';
import { isOwnThread, useThreadMode } from '../hooks/thread-mode';

export interface ChatActionsProviderProps {
  phone: string;
  thread: ThreadView | null;
  children: ReactNode;
}

/**
 * «رد» and «إعادة توجيه» (owner 2026-10-25), «نسخ» (2026-10-26) for one open chat. The state lives
 * with the chat screen, so leaving the chat drops the reply target. The menu, the forward and copy
 * sheets are drawn once here, not per bubble.
 */
export function ChatActionsProvider({ phone, thread, children }: ChatActionsProviderProps) {
  const mode = useThreadMode();
  const [reply, setReply] = useState<MessageView | null>(null);
  const [menu, setMenu] = useState<MessageView | null>(null);
  const [forward, setForward] = useState<MessageView | null>(null);
  const [copy, setCopy] = useState<CopyRequest | null>(null);
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
      showCopy: setCopy,
      notice,
      say,
    }),
    [mode.kind, reply, canSend, threadName, notice],
  );
  return (
    <ChatActionsContext.Provider value={value}>
      {children}
      <MessageMenu message={menu} phone={phone} onClose={() => setMenu(null)} />
      <ForwardSheet phone={phone} message={forward} onClose={() => setForward(null)} />
      <CopySheet request={copy} onClose={() => setCopy(null)} />
    </ChatActionsContext.Provider>
  );
}
