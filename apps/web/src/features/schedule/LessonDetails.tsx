import { lessonStatusStyle, lessonWhenText, subscriptionStatusStyle, type LessonView } from '@ab/shared';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { conflictText } from './ConflictNotice';
import { t } from '@/lib/i18n';
import { teacherLabel } from '@/lib/teacher-label';
import { locale } from '@/lib/locale';
import { lengthText } from './edit-time-text';
import { EditTimeLink } from './EditTimeLink';
import { durationMin, studentTimes, timeInCity } from './lessons';
import { LessonTags } from './LessonTags';
import { RIYADH_TZ } from './tz';

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/**
 * What the drawer says about a lesson (R-SCH-01, R-LES-01): status, the time in Riyadh with every
 * student's and the teacher's own clock, the teacher, the copied meeting link (or «via the classroom»
 * when the lesson's teacher holds it in the platform classroom), any reason, and the
 * clashes the daily job found when it generated the lesson (R-SCH-04). `onEditTime` adds
 * «عدّل الوقت» under the time (R-SCH-11).
 */
export function LessonDetails({ lesson, onEditTime }: { lesson: LessonView; onEditTime?: () => void }) {
  const at = new Date(lesson.starts_at);
  const teacherTz = lesson.teacher.tz;
  const mins = durationMin(lesson);
  const platform = lesson.platform_classroom ?? false;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip {...lessonStatusStyle[lesson.status]} label={t.enums.lessonStatus[lesson.status]} className="justify-self-start" />
        <LessonTags lesson={lesson} />
      </div>
      <dl className="grid gap-3">
        <Row label={t.schedule.time}>
          <span className="block">{`${lessonWhenText(at, RIYADH_TZ, locale)} ${t.schedule.riyadhTime}`}</span>
          {studentTimes(lesson, RIYADH_TZ).map((line) => (
            <span key={line} className="block text-xs text-ink-2">{line}</span>
          ))}
          {teacherTz !== RIYADH_TZ && (
            <span className="block text-xs text-ink-2">
              {t.schedule.teacherTime.replace('{time}', timeInCity(lesson.starts_at, teacherTz))}
            </span>
          )}
          <EditTimeLink lesson={lesson} onEdit={onEditTime} />
        </Row>
        {lesson.makeup_of && (
          <Row label={t.booking.makeup.missedLabel}>
            {lessonWhenText(new Date(lesson.makeup_of.starts_at), RIYADH_TZ, locale)}
            <span className="block text-xs text-ink-2">{t.booking.makeup.noUnit}</span>
          </Row>
        )}
        <Row label={t.schedule.duration}>{lengthText(mins)}</Row>
        <Row label={t.schedule.teacher}>{teacherLabel(lesson.teacher)}</Row>
        <Row label={t.schedule.students}>
          {lesson.students.map((s) => (
            <span key={s.id} className="me-3 inline-flex items-baseline gap-1.5">
              {s.name}
              <Ltr className="text-xs text-ink-3">{s.code}</Ltr>
              {s.unpaid && <StatusChip {...subscriptionStatusStyle.unpaid} label={t.subscriptions.unpaidFlag} size="sm" />}
            </span>
          ))}
        </Row>
        <Row label={t.lessons.joinLink}>
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
        </Row>
        {lesson.override_reason && <Row label={t.booking.overrideReason}>{lesson.override_reason}</Row>}
        {lesson.conflicts.length > 0 && (
          <Row label={t.schedule.needsReview}>
            <span className="block text-danger">{t.schedule.generatedConflict}</span>
            {lesson.conflicts.map((c, i) => (
              <span key={`${c.kind}-${i}`} className="block text-xs text-ink-2">{conflictText(c, teacherTz)}</span>
            ))}
          </Row>
        )}
        {lesson.cancel_reason && <Row label={t.lessons.reason}>{lesson.cancel_reason}</Row>}
      </dl>
    </>
  );
}
