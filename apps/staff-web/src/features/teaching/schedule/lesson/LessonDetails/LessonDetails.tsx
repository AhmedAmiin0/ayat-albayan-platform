import { lessonWhenAt } from '@ab/shared';
import { subscriptionStatusStyle } from '@ab/money';
import type { LessonView } from '@ab/schedule';
import { sameClockAt } from '@ab/time';
import {
  Avatar,
  buttonVariants,
  Ltr,
  StatusChip,
  t,
  usePlatformClassroom,
  teacherLabel,
  useClock,
  useViewerTz,
  useLessonStatusText,
} from '@ab/web-kit';
import { conflictText } from '@/features/teaching/schedule/reschedule/ConflictNotice';
import { lengthText } from '@/features/teaching/schedule/edit-time/edit-time-text';
import { EditTimeLink } from '@/features/teaching/schedule/edit-time/EditTimeLink';
import { durationMin, studentTimes, timeInCity } from '@/features/teaching/schedule/lesson/lessons';
import { DetailRow } from '@/features/teaching/schedule/lesson/DetailRow';
import { LessonTags } from '@/features/teaching/schedule/lesson/LessonTags';
import { TeacherConfirmedTag } from '@/features/teaching/schedule/lesson/TeacherConfirmedTag';

/** Times in the viewer's zone plus differing clocks; job-found clashes shown (R-SCH-04). */
export function LessonDetails({
  lesson,
  onEditTime,
}: {
  lesson: LessonView;
  onEditTime?: () => void;
}) {
  const clock = useClock();
  const tz = useViewerTz();
  const at = new Date(lesson.starts_at);
  const teacherTz = lesson.teacher.tz;
  const mins = durationMin(lesson);
  const platform = usePlatformClassroom(lesson.platform_classroom);
  const status = useLessonStatusText();
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip {...status.chip(lesson.status)} className="justify-self-start" />
        <LessonTags lesson={lesson} />
        <TeacherConfirmedTag lesson={lesson} />
      </div>
      <dl className="grid gap-3">
        <DetailRow label={t.schedule.time}>
          <span className="block">{`${lessonWhenAt(at, { tz, ...clock })} ${t.schedule.viewerTime}`}</span>
          {studentTimes(lesson, tz, clock).map((line) => (
            <span key={line} className="block text-xs text-ink-2">{line}</span>
          ))}
          {!sameClockAt(at, { a: teacherTz, b: tz }) && (
            <span className="block text-xs text-ink-2">
              {t.schedule.teacherTime.replace('{time}', timeInCity(lesson.starts_at, teacherTz, clock))}
            </span>
          )}
          <EditTimeLink lesson={lesson} onEdit={onEditTime} />
        </DetailRow>
        {lesson.makeup_of && (
          <DetailRow label={t.booking.makeup.missedLabel}>
            {lessonWhenAt(new Date(lesson.makeup_of.starts_at), { tz, ...clock })}
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
            // docs/07: the URL on its own one-line selectable row, then the full-width link button.
            <span className="grid gap-1.5">
              <Ltr className="block max-w-full truncate text-xs text-ink-3">{lesson.meeting_link.replace(/^https?:\/\//, '')}</Ltr>
              <a href={lesson.meeting_link} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'secondary' })}>
                {t.lessons.join}
              </a>
            </span>
          ) : (
            <span className="text-ink-3">{t.lessons.noLink}</span>
          )}
        </DetailRow>
        {lesson.override_reason && (
          <DetailRow label={t.booking.overrideReason}>{lesson.override_reason}</DetailRow>
        )}
        {lesson.conflicts.length > 0 && (
          <DetailRow label={t.schedule.needsReview}>
            <span className="block text-danger">{t.schedule.generatedConflict}</span>
            {lesson.conflicts.map((c, i) => (
              <span key={`${c.kind}-${i}`} className="block text-xs text-ink-2">{conflictText(c, { ...clock, tz }, teacherTz)}</span>
            ))}
          </DetailRow>
        )}
        {lesson.cancel_reason && (
          <DetailRow label={t.lessons.reason}>{lesson.cancel_reason}</DetailRow>
        )}
      </dl>
    </>
  );
}
