import type { BookingMode, StopDone } from '@ab/client-core';
import { Link } from '@tanstack/react-router';
import { Button, buttonVariants, Dialog, t } from '@ab/web-kit';

/** The guardian's chat in the viewer's own inbox. */
export interface StopChat {
  phone: string;
  mode: BookingMode;
}
const INBOX: Record<BookingMode, '/admin/inbox' | '/sales/inbox'> = {
  admin: '/admin/inbox',
  sales: '/sales/inbox',
};

interface StopDoneDialogProps {
  done: StopDone;
  /** Absent means no button. */
  chat?: StopChat | undefined;
  onClose: () => void;
}

export function StopDoneDialog({ done, chat, onClose }: StopDoneDialogProps) {
  const words = t.courseActions.stop;
  const actions = (
    <>
      {chat && (
        <Link
          to={INBOX[chat.mode]}
          search={{ phone: chat.phone, page: 1 }}
          className={buttonVariants({ variant: 'secondary' })}
        >
          {t.students.family.openChat}
        </Link>
      )}
      <Button type="button" onClick={onClose}>
        {words.close}
      </Button>
    </>
  );
  return (
    <Dialog layout="sheet" title={words.title} onClose={onClose} actions={actions}>
      <div role="status" className="grid gap-4 text-sm">
        <div className="grid gap-1">
          <p className="font-semibold text-ink">{done.head}</p>
          <p className="text-ink-2">{done.status}</p>
        </div>
        <section aria-label={words.nextTitle} className="grid gap-1 rounded-md bg-sunk px-3.5 py-2.5">
          <h3 className="text-xs font-semibold text-ink-3">{words.nextTitle}</h3>
          <p>{done.next}</p>
        </section>
        <section aria-label={words.notifiedTitle} className="grid gap-1">
          <h3 className="text-xs font-semibold text-ink-3">{words.notifiedTitle}</h3>
          <ul className="grid gap-0.5 text-ink-2">
            {done.notified.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>
    </Dialog>
  );
}
