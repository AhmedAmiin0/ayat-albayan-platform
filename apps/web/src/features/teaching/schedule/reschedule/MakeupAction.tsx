import { type LessonView, lessonWhenAt, makeupOffer } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { usePublicConfig } from '@/lib/settings/public-config';
import { RIYADH_TZ } from '../tz';
import { useClock } from '@/lib/clock';

/**
 * «حجز تعويضي» on a missed lesson (R-SCH-10): opens the booking wizard for that student with the
 * lesson preselected. One link per student, named when the lesson was a group's; a student whose
 * makeup is already booked gets «التعويض محجوز · <date>» instead (makeupOffer, shared with mobile:
 * charged miss, within settings.makeup_window_days, not a trial or a makeup). Admin only: the drawer is the admin's.
 */
export function MakeupAction({ lesson }: { lesson: LessonView }) {
  const clock = useClock();
  const { makeup_window_days: days } = usePublicConfig();
  const { open, booked } = makeupOffer(lesson, new Date(), days);
  if (open.length + booked.length === 0) return null;
  const group = lesson.students.length > 1;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {open.map((s) => (
        <Link
          key={s.id}
          to="/admin/book"
          search={{ kind: 'makeup', studentId: s.id, missedLessonId: lesson.id }}
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          {group ? `${t.booking.makeup.action} · ${s.name}` : t.booking.makeup.action}
        </Link>
      ))}
      {booked.map((s) => (
        <span key={s.id} className="rounded-sm border border-rule px-2 py-1 text-xs text-ink-2">
          {group && `${s.name}: `}
          {t.booking.makeup.bookedChip.replace('{when}', lessonWhenAt(new Date(s.makeup.starts_at), { tz: RIYADH_TZ, ...clock }))}
        </span>
      ))}
    </div>
  );
}
