import { useState, type ReactNode } from 'react';
import { Cartouche } from '@/components/ui/display/cartouche';
import { PageHead } from '@/components/ui/layout/page';
import { t } from '@/lib/i18n/i18n';
import { useInboxMode } from './mode';
import { NewChatForm, NewChatToggle } from './NewChatForm';

export interface InboxListHeadProps {
  /** The conversations the list holds: «12 محادثة» (none while loading). */
  total?: number | undefined;
  /** Extra items before «محادثة جديدة» (sales: the running lessons chip). */
  head?: ReactNode;
  /** «محادثة جديدة» opened a number (E.164). */
  onOpen: (phone: string) => void;
}

/**
 * The list column's first row (docs/07 principle 4): the screen's ONE cartouche, the count, `head`
 * and the icon-only «محادثة جديدة» (admin and sales), whose form unfolds under the row.
 */
export function InboxListHead({ total, head, onOpen }: InboxListHeadProps) {
  const mode = useInboxMode();
  const [open, setOpen] = useState(false);
  const newChat = mode !== 'teacher';
  return (
    <>
      <PageHead className="mb-3 gap-x-3 gap-y-2">
        <Cartouche>{mode !== 'admin' ? t.nav.conversations : t.inbox.title}</Cartouche>
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
