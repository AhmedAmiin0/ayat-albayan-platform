import { counted, type BookingResult } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { NuqtaGlyph } from '@/components/ui/display/nuqta-glyph';
import { weekStart, zonedParts } from '@/features/teaching/schedule/tz';
import { RecordPaymentDialog } from '@/features/finance/payments/record/RecordPaymentDialog';
import { CreateSubscriptionDialog } from '@/features/finance/subscriptions/create/CreateSubscriptionDialog';
import { t } from '@/lib/i18n/i18n';
import { invoicesQuery } from '../../invoice/api.invoice';
import type { BookingKind } from '../../draft/contract';
import type { PickedStudent } from '../../draft/draft';
import { InvoiceButton } from '../../invoice/InvoiceDialog';
import { useBookingMode, useChatReturn } from '../../mode';
import { pickedText } from '../slots/SlotStep';
import { useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface BookedPanelProps {
  result: BookingResult;
  teacherId: string;
  /** The family's zone, for the first lesson's local time. */
  tz: string;
  /** The booking type: a subscription or makeup shows its invoice; a makeup never offers a subscription. */
  kind?: BookingKind;
  /** A regular package: «اعمل الاشتراك» for this student (R-SUB-01). */
  subscribeFor?: PickedStudent | null;
  /** Booked from a lead: «ارجع للمحادثة» opens their WhatsApp thread. */
  chatPhone?: string | null;
}

/** The first lesson and its week in the viewer's zone `viewer`, as the calendar («افتح الجدول»). */
function firstLesson(result: BookingResult, viewer: string) {
  const first = result.lessons.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  return { first, week: first ? weekStart(zonedParts(new Date(first.starts_at), viewer).date) : undefined };
}

/**
 * After POST /booking: what was created, the queued WhatsApp confirmation, the subscription for a
 * regular package, and the way to the week (or back to the chat).
 */
export function BookedPanel({ result, teacherId, tz, kind, subscribeFor, chatPhone }: BookedPanelProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const sales = useBookingMode() === 'sales';
  const backToChat = useChatReturn();
  const [dialog, setDialog] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const { first, week } = firstLesson(result, clock.tz);
  const offer = !!subscribeFor && !subscribed;
  // The assistant never has an invoice (her course follows the subscription she made).
  const invoices = useQuery({ ...invoicesQuery({ ruleId: result.rule_id }), enabled: !sales && !!kind && kind !== 'trial' });
  const invoice = invoices.data?.[0];
  return (
    <section aria-labelledby="booked-title" className="grid justify-items-start gap-3 py-2">
      <div role="status">
        <h2 id="booked-title" className="flex items-center gap-2 font-display text-h3 font-bold">
          <NuqtaGlyph shape="fill" className="text-ok" />
          <span>{kind === 'makeup' ? t.booking.makeup.booked : t.booking.booked}</span>
        </h2>
        {subscribed && <p className="mt-1 font-semibold text-ok">{t.subscriptions.saved}</p>}
      </div>
      {first && <p>{t.booking.firstLesson.replace('{when}', pickedText(first.starts_at, tz, clock))}</p>}
      <p className="text-sm text-ink-2 tabular-nums">{counted(t.schedule.lessonCount, result.lessons.length)}</p>
      {result.message_ids.length > 0 && <p className="text-sm text-ink-2">{t.booking.confirmationNote}</p>}
      <div className="flex flex-wrap gap-2">
        {offer && (
          <Button type="button" onClick={() => setDialog(true)}>
            {t.inbox.subscription.make}
          </Button>
        )}
        {sales ? (
          <Link to="/sales/students" search={{ view: 'mine' }} className={buttonVariants()}>
            {t.assistantPortal.register.openMyStudents}
          </Link>
        ) : (
          <Link
            to="/admin/schedule"
            search={{ week, teachers: [teacherId] }}
            className={buttonVariants({ variant: offer ? 'secondary' : 'primary' })}
          >
            {t.booking.openSchedule}
          </Link>
        )}
        {invoice && <InvoiceButton invoice={invoice} />}
        {kind === 'package' && subscribed && invoice && subscribeFor && !paid && (
          <Button type="button" variant="secondary" onClick={() => setPaying(true)}>
            {t.finance.recordFromInvoice}
          </Button>
        )}
        {backToChat && (
          <Button type="button" variant="ghost" onClick={backToChat}>
            {t.inbox.subscription.backToChat}
          </Button>
        )}
        {chatPhone && !backToChat && (
          <Link to={sales ? '/sales/inbox' : '/admin/inbox'} search={{ phone: chatPhone, page: 1 }} className={buttonVariants({ variant: 'ghost' })}>
            {t.inbox.subscription.backToChat}
          </Link>
        )}
      </div>
      {paying && invoice && subscribeFor && (
        <RecordPaymentDialog
          invoiceId={invoice.id}
          student={subscribeFor}
          onClose={() => setPaying(false)}
          onSaved={() => (setPaying(false), setPaid(true))}
        />
      )}
      {paid && <p className="font-semibold text-ok">{t.payments.saved}</p>}
      {dialog && subscribeFor && (
        <CreateSubscriptionDialog
          student={subscribeFor}
          onClose={() => setDialog(false)}
          onSaved={() => {
            setDialog(false);
            setSubscribed(true);
          }}
        />
      )}
    </section>
  );
}
