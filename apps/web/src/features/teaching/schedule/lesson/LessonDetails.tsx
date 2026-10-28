import { lessonStatusStyle, type LessonView, lessonWhenAt, subscriptionStatusStyle } from '@ab/shared';
import { Avatar } from '@/components/ui/display/avatar';
import { buttonVariants } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { conflictText } from '../reschedule/ConflictNotice';
import { t } from '@/lib/i18n/i18n';
import { usePlatformClassroom } from '@/lib/settings/public-config';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { lengthText } from '../edit-time/edit-time-text';
import { EditTimeLink } from '../edit-time/EditTimeLink';
import { durationMin, studentTimes, timeInCity } from './lessons';
import { DetailRow } from './DetailRow';
import { LessonTags } from './LessonTags';
import { RIYADH_TZ } from '../tz';
import { useClock } from '@/lib/clock';

/**
 * What the drawer says about a lesson (R-SCH-01, R-LES-01): status, the time in Riyadh with every
 * student's and the teacher's own clock, the teacher, the copied meeting link (or «via the classroom»
 * when the lesson's teacher holds it in the platform classroom), any reason, and the
 * clashes the daily job found when it generated the lesson (R-SCH-04). `onEditTime` adds
 * «عدّل الوقت» under the time (R-SCH-11).
 */
export function LessonDetails({ lesson, onEditTime }: { lesson: LessonView; onEditTime?: () => void }) {
  const clock = useClock();
  const at = new Date(lesson.starts_at);
  const teacherTz = lesson.teacher.tz;
  const mins = durationMin(lesson);
  const platform = usePlatformClassroom(lesson.platform_classroom);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} className="justify-self-start" />
        <LessonTags lesson={lesson} />
      </div>
      <dl className="grid gap-3">
        <DetailRow label={t.schedule.time}>
          <span className="block">{`${lessonWhenAt(at, { tz: RIYADH_TZ, ...clock })} ${t.schedule.riyadhTime}`}</span>
          {studentTimes(lesson, RIYADH_TZ, clock).map((line) => (
            <span key={line} className="block text-xs text-ink-2">{line}</span>
          ))}
          {teacherTz !== RIYADH_TZ && (
            <span className="block text-xs text-ink-2">
              {t.schedule.teacherTime.replace('{time}', timeInCity(lesson.starts_at, teacherTz, clock))}
            </span>
          )}
          <EditTimeLink lesson={lesson} onEdit={onEditTime} />
        </DetailRow>
        {lesson.makeup_of && (
          <DetailRow label={t.booking.makeup.missedLabel}>
            {lessonWhenAt(new Date(lesson.makeup_of.starts_at), { tz: RIYADH_TZ, ...clock })}
            <span className="block text-xs text-ink-2">{t.booking.makeup.noUnit}</span>
          </DetailRow>
        )}
        <DetailRow label={t.schedule.duration}>{lengthText(mins)}</DetailRow>
        <DetailRow label={t.schedule.teacher}>
          <span className="flex items-center gap-2.5">
            <Avatar name={teacherLabel(lesson.teacher)} id={lesson.teacher.id} src={lesson.teacher.avatar_url} size="md" decorative />
            {teacherLabel(lesson.teacher)}
          </span>
        </DetailRow>
        <DetailRow label={t.schedule.students}>
          {lesson.students.map((s) => (
            <span key={s.id} className="me-3 inline-flex items-baseline gap-1.5">
              {s.name}
              <Ltr className="text-xs text-ink-3">{s.code}</Ltr>
              {s.unpaid && <StatusChip {...subscriptionStatusStyle.unpaid} label={t.subscriptions.unpaidFlag} size="sm" />}
            </span>
          ))}
        </DetailRow>
        <DetailRow label={t.lessons.joinLink}>
          {platform ? (
            <span className="text-ink-2">{t.lessons.viaClassroom}</span>
          ) : lesson.meeting_link ? (
            <a href={lesson.meeting_link} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
              {t.lessons.join}
              <Ltr className="text-2xs text-ink-3">{lesson.meeting_link.replace(/^https?:\/\//, '')}</Ltr>
            </a>
          ) : (
            <span className="text-ink-3">{t.lessons.noLink}</span>
          )}
        </DetailRow>
        {lesson.override_reason && <DetailRow label={t.booking.overrideReason}>{lesson.override_reason}</DetailRow>}
        {lesson.conflicts.length > 0 && (
          <DetailRow label={t.schedule.needsReview}>
            <span className="block text-danger">{t.schedule.generatedConflict}</span>
            {lesson.conflicts.map((c, i) => (
              <span key={`${c.kind}-${i}`} className="block text-xs text-ink-2">{conflictText(c, clock, teacherTz)}</span>
            ))}
          </DetailRow>
        )}
        {lesson.cancel_reason && <DetailRow label={t.lessons.reason}>{lesson.cancel_reason}</DetailRow>}
      </dl>
    </>
  );
}
