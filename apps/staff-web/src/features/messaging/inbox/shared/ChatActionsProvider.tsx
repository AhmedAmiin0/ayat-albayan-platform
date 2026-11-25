import { canReact, type MessageView, type ThreadView } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Toast, t } from '@ab/web-kit';
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

/** ThreadPane is keyed by phone so another chat starts with no target; reply and edit exclude. */
export function ChatActionsProvider({ thread, enabled, children }: ChatActionsProviderProps) {
  const [forwarding, setForwarding] = useState<MessageView | null>(null);
  const [notice, setNotice] = useState<ForwardSummary | null>(null);
  // Stable (the React Compiler memoizes it): the toast's timer restarts whenever onDismiss changes
  // (the chat polls every 10 s).
  const dismiss = () => setNotice(null);
  const replyBlocked = useMaySend(thread) ? null : t.inbox.sessionClosed;
  const { display_name: name, phone_e164: phone } = thread;
  const picks = usePicks(phone);
  // A refused or failed reaction is reported in the same toast.
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
