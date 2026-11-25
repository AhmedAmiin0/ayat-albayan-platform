import { lessonWhenAt } from '@ab/shared';
import { type LessonView, makeupOffer } from '@ab/schedule';
import { Link } from '@tanstack/react-router';
import { buttonVariants, ButtonRow, t, useViewerTz, usePublicConfig, useClock } from '@ab/web-kit';

/** Admin only (R-SCH-10); eligibility via makeupOffer, shared with mobile. */
export function MakeupAction({ lesson }: { lesson: LessonView }) {
  const clock = useClock();
  const tz = useViewerTz();
  const { makeup_window_days: days } = usePublicConfig();
  const { open, booked } = makeupOffer(lesson, new Date(), days);
  if (open.length + booked.length === 0) return null;
  const group = lesson.students.length > 1;
  return (
    <div className="grid gap-2">
      {open.length > 0 && (
        <ButtonRow>
          {open.map((s) => (
            <Link
              key={s.id}
              to="/admin/book"
              search={{ kind: 'makeup', studentId: s.id, missedLessonId: lesson.id }}
              className={buttonVariants({ variant: 'secondary' })}
            >
              {group ? `${t.booking.makeup.action} · ${s.name}` : t.booking.makeup.action}
            </Link>
          ))}
        </ButtonRow>
      )}
      {booked.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {booked.map((s) => (
            <span key={s.id} className="rounded-sm border border-rule px-2 py-1 text-xs text-ink-2">
              {group && `${s.name}: `}
              {t.booking.makeup.bookedChip.replace('{when}', lessonWhenAt(new Date(s.makeup.starts_at), { tz, ...clock }))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
