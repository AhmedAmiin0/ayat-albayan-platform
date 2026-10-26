import { lessonStatusStyle, lessonWhenText, type SalesScheduleLesson } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { DetailRow } from '@/features/teaching/schedule/lesson/DetailRow';
import { durationMin, timeInCity } from '@/features/teaching/schedule/lesson/lessons';
import { LessonTags } from '@/features/teaching/schedule/lesson/LessonTags';
import { lengthText } from '@/features/teaching/schedule/edit-time/edit-time-text';
import { RIYADH_TZ } from '@/features/teaching/schedule/tz';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { locale } from '@/lib/i18n/locale';

/** «عند الطالب 16:00 بتوقيت القاهرة» per student zone, then the teacher's, each only when not Riyadh. */
export function salesClockLines(lesson: SalesScheduleLesson): string[] {
  const zones = [...new Set(lesson.students.map((s) => s.tz ?? RIYADH_TZ))].filter((tz) => tz !== RIYADH_TZ);
  const lines = zones.map((tz) => t.schedule.studentTime.replace('{time}', timeInCity(lesson.starts_at, tz)));
  const teacherTz = lesson.teacher.tz;
  if (teacherTz && teacherTz !== RIYADH_TZ) lines.push(t.schedule.teacherTime.replace('{time}', timeInCity(lesson.starts_at, teacherTz)));
  return lines;
}

/**
 * The admin drawer's details, read-only for sales (docs/16): status and tags, the Riyadh time with
 * each student's and the teacher's own clock, the length, the teacher and the students with their
 * codes. Sales' lesson never carries a link, a reason, a flag or money, so none of them is shown.
 */
export function SalesLessonDetails({ lesson }: { lesson: SalesScheduleLesson }) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} className="justify-self-start" />
        <LessonTags lesson={lesson} />
      </div>
      <dl className="grid gap-3">
        <DetailRow label={t.schedule.time}>
          <span className="block">{`${lessonWhenText(new Date(lesson.starts_at), RIYADH_TZ, locale)} ${t.schedule.riyadhTime}`}</span>
          {salesClockLines(lesson).map((line) => (
            <span key={line} className="block text-xs text-ink-2">{line}</span>
          ))}
        </DetailRow>
        <DetailRow label={t.schedule.duration}>{lengthText(durationMin(lesson))}</DetailRow>
        <DetailRow label={t.schedule.teacher}>{teacherLabel(lesson.teacher)}</DetailRow>
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
