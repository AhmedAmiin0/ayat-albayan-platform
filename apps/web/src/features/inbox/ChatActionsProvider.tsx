import type { MessageQuote, MessageView, ThreadView } from '@ab/shared';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n';
import { ChatActionsContext, type ChatActions } from './chat-actions';
import { ForwardDialog } from './ForwardDialog';
import { forwardSummary, type ForwardSummary } from './forward-summary';
import { quoteOf } from './quote';

export interface ChatActionsProviderProps {
  thread: ThreadView;
  /** A chat she may write in, outside teacher mode. */
  enabled: boolean;
  children: ReactNode;
}

/**
 * The open chat's «رد» target, its forward dialog and their toasts (owner 2026-10-25). ThreadPane is
 * keyed by phone, so another chat starts with no target. While the window is closed «رد» is off with
 * the closed-window notice as its hint, and a target set before is not offered to the composer.
 */
export function ChatActionsProvider({ thread, enabled, children }: ChatActionsProviderProps) {
  const [target, setTarget] = useState<MessageQuote | null>(null);
  const [forwarding, setForwarding] = useState<MessageView | null>(null);
  const [notice, setNotice] = useState<ForwardSummary | null>(null);
  // Stable: the toast's timer restarts whenever onDismiss changes (the chat polls every 10 s).
  const dismiss = useCallback(() => setNotice(null), []);
  const replyBlocked = thread.session_open ? null : t.inbox.sessionClosed;
  const { display_name: name, phone_e164: phone } = thread;
  const value = useMemo<ChatActions>(
    () => ({
      enabled,
      chat: { name, phone },
      replyBlocked,
      target: replyBlocked ? null : target,
      reply: (m) => setTarget(quoteOf(m)),
      cancelReply: (id) => setTarget((now) => (id === undefined || now?.id === id ? null : now)),
      forward: (m) => setForwarding(m),
      notLoaded: () => setNotice({ text: t.inbox.reply.notLoaded, tone: 'info' }),
    }),
    [enabled, name, phone, replyBlocked, target],
  );

  return (
    <ChatActionsContext.Provider value={value}>
      {children}
      {forwarding && (
        <ForwardDialog
          message={forwarding}
          from={phone}
          onClose={() => setForwarding(null)}
          onDone={(res, names) => {
            setForwarding(null);
            setNotice(forwardSummary(res, names));
          }}
        />
      )}
      {notice && (
        <Toast
          message={notice.text}
          tone={notice.tone}
          duration={notice.text.includes('\n') ? 10_000 : 5000}
          className="whitespace-pre-line"
          onDismiss={dismiss}
        />
      )}
    </ChatActionsContext.Provider>
  );
}
