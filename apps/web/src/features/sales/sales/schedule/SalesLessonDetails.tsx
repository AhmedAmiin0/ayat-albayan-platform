import { lessonStatusStyle, lessonWhenAt, sameClockAt, type SalesScheduleLesson } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { DetailRow } from '@/features/teaching/schedule/lesson/DetailRow';
import { durationMin, timeInCity } from '@/features/teaching/schedule/lesson/lessons';
import { LessonTags } from '@/features/teaching/schedule/lesson/LessonTags';
import { lengthText } from '@/features/teaching/schedule/edit-time/edit-time-text';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { LessonMeetingLink } from './LessonMeetingLink';
import { type Clock, useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

/**
 * «عند الطالب 16:00 بتوقيت القاهرة» per student zone, then the teacher's, each only when its clock
 * differs from the viewer's (`clock.tz`, useViewerTz()) at that instant.
 */
export function salesClockLines(
  lesson: SalesScheduleLesson,
  clock: Clock & { tz: string },
): string[] {
  const at = new Date(lesson.starts_at);
  const viewer = clock.tz;
  const other = (tz: string | null | undefined): tz is string =>
    !!tz && !sameClockAt(at, { a: tz, b: viewer });
  const zones = [...new Set(lesson.students.map((s) => s.tz))].filter(other);
  const lines = zones.map((tz) => t.schedule.studentTime.replace('{time}', timeInCity(lesson.starts_at, tz, clock)));
  const teacherTz = lesson.teacher.tz;
  if (other(teacherTz)) lines.push(t.schedule.teacherTime.replace('{time}', timeInCity(lesson.starts_at, teacherTz, clock)));
  return lines;
}

/**
 * The admin drawer's details, read-only for sales (docs/16): status and tags, the viewer's time with
 * each student's and the teacher's own clock, the length, the teacher and the students with their
 * codes, and the lesson's link (owner 2026-10-26). Sales' lesson never carries a reason, a flag or
 * money, so none of them is shown.
 */
export function SalesLessonDetails({ lesson }: { lesson: SalesScheduleLesson }) {
  const clock = useClock();
  const tz = useViewerTz();
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} className="justify-self-start" />
        <LessonTags lesson={lesson} />
      </div>
      <dl className="grid gap-3">
        <DetailRow label={t.schedule.time}>
          <span className="block">{`${lessonWhenAt(new Date(lesson.starts_at), { tz, ...clock })} ${t.schedule.viewerTime}`}</span>
          {salesClockLines(lesson, { ...clock, tz }).map((line) => (
            <span key={line} className="block text-xs text-ink-2">{line}</span>
          ))}
        </DetailRow>
        <DetailRow label={t.schedule.duration}>{lengthText(durationMin(lesson))}</DetailRow>
        <DetailRow label={t.schedule.teacher}>{teacherLabel(lesson.teacher)}</DetailRow>
        <DetailRow label={t.lessons.joinLink}>
          <LessonMeetingLink lesson={lesson} />
        </DetailRow>
        <DetailRow label={t.schedule.students}>
          {lesson.students.map((s) => (
            <span key={s.id} className="me-3 inline-flex items-baseline gap-1.5">
              {s.name}
              <Ltr className="text-xs text-ink-3">{s.code}</Ltr>
            </span>
          ))}
        </DetailRow>
      </dl>
    </>
  );
}
