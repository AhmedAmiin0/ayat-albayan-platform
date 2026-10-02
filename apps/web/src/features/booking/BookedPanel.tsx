import { counted, type BookingResult } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { RIYADH_TZ, weekStart, zonedParts } from '@/features/schedule/tz';
import { CreateSubscriptionDialog } from '@/features/subscriptions/CreateSubscriptionDialog';
import { t } from '@/lib/i18n';
import type { PickedStudent } from './draft';
import { pickedText } from './SlotStep';

export interface BookedPanelProps {
  result: BookingResult;
  teacherId: string;
  /** The family's zone, for the first lesson's local time. */
  tz: string;
  /** A regular package: «اعمل الاشتراك» for this student (R-SUB-01). */
  subscribeFor?: PickedStudent | null;
  /** Booked from a lead: «ارجع للمحادثة» opens their WhatsApp thread. */
  chatPhone?: string | null;
}

/** The first lesson and the Riyadh week it falls in (the «افتح الجدول» link). */
function firstLesson(result: BookingResult) {
  const first = result.lessons.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  return { first, week: first ? weekStart(zonedParts(new Date(first.starts_at), RIYADH_TZ).date) : undefined };
}

/**
 * After POST /booking: what was created, the queued WhatsApp confirmation, the subscription for a
 * regular package, and the way to the week (or back to the chat).
 */
export function BookedPanel({ result, teacherId, tz, subscribeFor, chatPhone }: BookedPanelProps) {
  const [dialog, setDialog] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { first, week } = firstLesson(result);
  const offer = !!subscribeFor && !subscribed;
  return (
    <section aria-labelledby="booked-title" className="grid justify-items-start gap-3 py-2">
      <div role="status">
        <h2 id="booked-title" className="flex items-center gap-2 font-display text-h3 font-bold">
          <NuqtaGlyph shape="fill" className="text-ok" />
          <span>{t.booking.booked}</span>
        </h2>
        {subscribed && <p className="mt-1 font-semibold text-ok">{t.subscriptions.saved}</p>}
      </div>
      {first && <p>{t.booking.firstLesson.replace('{when}', pickedText(first.starts_at, tz))}</p>}
      <p className="text-sm text-ink-2 tabular-nums">{counted(t.schedule.lessonCount, result.lessons.length)}</p>
      {result.message_ids.length > 0 && <p className="text-sm text-ink-2">{t.booking.confirmationNote}</p>}
      <div className="flex flex-wrap gap-2">
        {offer && (
          <Button type="button" onClick={() => setDialog(true)}>
            {t.inbox.subscription.make}
          </Button>
        )}
        <Link
          to="/admin/schedule"
          search={{ week, teacher: teacherId }}
          className={buttonVariants({ variant: offer ? 'secondary' : 'primary' })}
        >
          {t.booking.openSchedule}
        </Link>
        {chatPhone && (
          <Link to="/admin/inbox" search={{ phone: chatPhone, page: 1 }} className={buttonVariants({ variant: 'ghost' })}>
            {t.inbox.subscription.backToChat}
          </Link>
        )}
      </div>
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
