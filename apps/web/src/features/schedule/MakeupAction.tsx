import { lessonWhenText, makeupOffer, type LessonView } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { buttonVariants } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { usePublicConfig } from '@/lib/public-config';
import { RIYADH_TZ } from './tz';

/**
 * «حجز تعويضي» on a missed lesson (R-SCH-10): opens the booking wizard for that student with the
 * lesson preselected. One link per student, named when the lesson was a group's; a student whose
 * makeup is already booked gets «التعويض محجوز · <date>» instead (makeupOffer, shared with mobile:
 * charged miss, within settings.makeup_window_days, not a trial or a makeup). Admin only: the drawer is the admin's.
 */
export function MakeupAction({ lesson }: { lesson: LessonView }) {
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
          {t.booking.makeup.bookedChip.replace('{when}', lessonWhenText(new Date(s.makeup.starts_at), RIYADH_TZ, locale))}
        </span>
      ))}
    </div>
  );
}
