import { conflictLine } from '@/booking';
import { t } from '@/core/lib/i18n/i18n';
import { usePlatformClassroom } from '@/core/lib/query/public-config';
import { DetailsFact, DetailsGroup, DetailsLine } from './DetailsGroup';
import { DetailsLink } from './DetailsLink';
import type { DetailsLesson, DetailsRole } from './details-text';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { DetailsTeacher } from './DetailsTeacher';

/** Neither field sent (sales' «الجدول» never gets the way in): unknown, not «لا يوجد رابط». */
const linkKnown = (l: DetailsLesson): boolean => l.meeting_link !== undefined || l.platform_classroom !== undefined;

/**
 * «بيانات الحلقة»: the teacher, the way in (DetailsLink, every role: sales too since owner
 * 2026-10-26; left out when the lesson carries neither field), the override and cancel reasons and the clashes the daily job found (R-SCH-04), in
 * the bad tone.
 */
export function DetailsAbout({ lesson, role }: { lesson: DetailsLesson; role: DetailsRole }) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const platform = usePlatformClassroom(lesson.platform_classroom);
  // The override reason and the generated clashes are the admin's (no teacher screen shows them).
  const admin = role === 'admin';
  const conflicts = admin ? (lesson.conflicts ?? []) : [];
  return (
    <DetailsGroup label={t.lessons.sheet.about}>
      <DetailsFact label={t.schedule.teacher}><DetailsTeacher teacher={lesson.teacher} photo={admin} /></DetailsFact>
      {linkKnown(lesson) ? <DetailsLink link={lesson.meeting_link ?? null} platform={platform} /> : null}
      {admin && lesson.override_reason ? (
        <DetailsFact label={t.booking.overrideReason}>{lesson.override_reason}</DetailsFact>
      ) : null}
      {lesson.cancel_reason ? (
        <DetailsFact label={t.lessons.reason}>{lesson.cancel_reason}</DetailsFact>
      ) : null}
      {conflicts.length > 0 ? (
        <DetailsFact label={t.schedule.needsReview}>
          <DetailsLine tone="bad">{t.schedule.generatedConflict}</DetailsLine>
          {conflicts.map((c, i) => (
            <DetailsLine key={`${c.kind}-${i}`}>{conflictLine(c, cycle, tz)}</DetailsLine>
          ))}
        </DetailsFact>
      ) : null}
    </DetailsGroup>
  );
}
