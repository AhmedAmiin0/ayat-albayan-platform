import { useRef, useState } from 'react';
import { buttonVariants } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { InstantLessonDialog } from './InstantLessonDialog';
import { InternalMeetingDialog } from './InternalMeetingDialog';
import { ScheduledMeetingDialog } from './ScheduledMeetingDialog';

const item = 'flex min-h-11 w-full items-center rounded-sm px-3 text-start text-sm hover:bg-sunk sm:min-h-9';

/**
 * «اجتماع جديد» on the admin schedule and classrooms pages: «اجتماع داخلي» makes a standalone room
 * (a link to share, no lesson), «اجتماع مجدول» the same room at a time with invitations, «ابدأ الآن» starts an instant lesson
 * (dialog, then straight into /classroom/$lessonId), «جدولة» opens the booking wizard. A native
 * disclosure: keyboard and screen reader for free. Plain links, like «ادخل الحلقة»: no router needed.
 * One filled primary per screen (docs/07 §6): it is the primary except beside another one («حجز حلقة»).
 */
export function NewMeetingMenu({ variant = 'primary' }: { variant?: 'primary' | 'secondary' }) {
  const [instant, setInstant] = useState(false);
  const [internal, setInternal] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const menu = useRef<HTMLDetailsElement>(null);
  const close = () => menu.current?.removeAttribute('open');
  return (
    <>
      <details ref={menu} className="relative">
        <summary className={cn(buttonVariants({ variant }), 'cursor-pointer list-none [&::-webkit-details-marker]:hidden')}>
          <Icon name="plus" />
          {t.meetings.new}
        </summary>
        <div role="group" aria-label={t.meetings.new} className="absolute end-0 z-20 mt-1 grid w-max min-w-full gap-0.5 rounded-md border border-rule bg-raised p-1.5 shadow-md">
          <button
            type="button"
            className={item}
            onClick={() => {
              close();
              setInternal(true);
            }}
          >
            {t.meetings.internal.item}
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              close();
              setScheduled(true);
            }}
          >
            {t.meetingInvites.scheduledItem}
          </button>
          <button
            type="button"
            className={item}
            onClick={() => {
              close();
              setInstant(true);
            }}
          >
            {t.meetings.startNow}
          </button>
          <a href="/admin/book" className={item}>
            {t.meetings.schedule}
          </a>
        </div>
      </details>
      {internal && <InternalMeetingDialog onClose={() => setInternal(false)} />}
      {scheduled && <ScheduledMeetingDialog onClose={() => setScheduled(false)} />}
      {instant && (
        <InstantLessonDialog
          onClose={() => setInstant(false)}
          onStarted={(lessonId) => window.location.assign(`/classroom/${lessonId}`)}
        />
      )}
    </>
  );
}
