import { useState, type ReactNode } from 'react';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useInboxMode } from '@/features/messaging/inbox/shared/mode';
import { LiveDot } from './LiveDot';
import { NewChatForm, NewChatToggle } from './NewChatForm';

export interface InboxListHeadProps {
  total?: number | undefined;
  head?: ReactNode;
  onOpen: (phone: string) => void;
}

/** A teacher never joins the realtime channel, so no live dot for them. */
export function InboxListHead({ total, head, onOpen }: InboxListHeadProps) {
  const mode = useInboxMode();
  const [open, setOpen] = useState(false);
  const newChat = mode !== 'teacher';
  return (
    <>
      <PageHead className="mb-3 gap-x-3 gap-y-2">
        <Cartouche>{mode !== 'admin' ? t.nav.conversations : t.inbox.title}</Cartouche>
        {newChat && <LiveDot />}
        {total !== undefined && (
          <span className="text-sm text-ink-3 tabular-nums">{t.leads.count.replace('{n}', String(total))}</span>
        )}
        <div className="ms-auto flex items-center gap-1">
          {head}
          {newChat && <NewChatToggle open={open} onToggle={() => setOpen((o) => !o)} />}
        </div>
      </PageHead>
      {newChat && open && (
        <NewChatForm
          onOpen={(phone) => {
            setOpen(false);
            onOpen(phone);
          }}
        />
      )}
    </>
  );
}
