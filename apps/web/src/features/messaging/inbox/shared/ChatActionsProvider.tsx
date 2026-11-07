import { canReact, type MessageView, type ThreadView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Toast } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n/i18n';
import { ChatActionsContext, type ChatActions } from './chat-actions';
import { useMaySend } from './may-send';
import { usePicks } from './use-picks';
import { ForwardDialog } from '@/features/messaging/inbox/messages/forward/ForwardDialog';
import { forwardSummary, type ForwardSummary } from '@/features/messaging/inbox/messages/forward/forward-summary';
import { useReact } from '@/features/messaging/inbox/messages/reactions/use-react';
import { ChatSearchProvider } from '@/features/messaging/inbox/search';

export interface ChatActionsProviderProps {
  thread: ThreadView;
  /** A chat she may write in, outside teacher mode. */
  enabled: boolean;
  children: ReactNode;
}

/**
 * The open chat's «رد» target, its forward dialog and their toasts (owner 2026-10-25). ThreadPane is
 * keyed by phone, so another chat starts with no target. «رد» follows the text rule (useMaySend: tried
 * after the window on a Kapso chat line); where a text cannot go it is off with the closed-window
 * notice as its hint, and a target set before is not offered to the composer. «بحث» lives here too.
 * «تعديل» (owner 2026-11-07) fills the box with the original's text; it and «رد» exclude each
 * other.
 */
export function ChatActionsProvider({ thread, enabled, children }: ChatActionsProviderProps) {
  const [forwarding, setForwarding] = useState<MessageView | null>(null);
  const [notice, setNotice] = useState<ForwardSummary | null>(null);
  // Stable (the React Compiler memoizes it): the toast's timer restarts whenever onDismiss changes
  // (the chat polls every 10 s).
  const dismiss = () => setNotice(null);
  const replyBlocked = useMaySend(thread) ? null : t.inbox.sessionClosed;
  const { display_name: name, phone_e164: phone } = thread;
  const picks = usePicks(phone);
  // «تفاعل» (owner 2026-10-27): a refused or failed reaction says so in the same toast.
  const { mutate: reactNow } = useReact(phone, (text) => setNotice({ text, tone: 'error' }));
  const value: ChatActions = {
    enabled,
    chat: { name, phone },
    replyBlocked,
    ...picks,
    target: replyBlocked ? null : picks.target,
    editing: replyBlocked ? null : picks.editing,
    forward: (m) => setForwarding(m),
    notLoaded: () => setNotice({ text: t.inbox.reply.notLoaded, tone: 'info' }),
    reactable: (m) => enabled && canReact(m, thread, new Date()),
    react: (m, emoji) => reactNow({ message: m, emoji }),
  };

  return (
    <ChatActionsContext.Provider value={value}>
      <ChatSearchProvider phone={phone}>{children}</ChatSearchProvider>
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
