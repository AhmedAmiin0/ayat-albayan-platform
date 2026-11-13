import type { AttendanceTableRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { buttonVariants } from '@/components/ui/form/button';
import { LessonRecording, recordedLessonIdsQuery } from '@/features/people/students';
import { LessonReportView } from '@/features/reporting/report-page';
import { t } from '@/lib/i18n/i18n';
import { revealOnMount } from '@/lib/dom/mount-refs';

// A secondary button; Safari still draws the disclosure triangle unless it is hidden.
const SUMMARY = [
  buttonVariants({ variant: 'secondary', size: 'sm' }),
  '[&::-webkit-details-marker]:hidden',
].join(' ');

type Row = Pick<AttendanceTableRow, 'lesson_id' | 'starts_at' | 'report_id'>;

export interface LessonDisclosureProps {
  row: Row;
  studentId: string;
}

/** An old «تسجيل الحلقة» link (#recording-<lesson id>) lands on this lesson's row open. */
const linkedHere = (lessonId: string): boolean =>
  window.location.hash === `#recording-${lessonId}`;

/**
 * This student's report and recording, read inside the lesson row (docs/49: no «التقارير» tab).
 * Nothing is fetched for a row until it is opened; one cached id list says which have a recording.
 */
export function LessonDisclosure({ row, studentId }: LessonDisclosureProps) {
  const recorded = useQuery(recordedLessonIdsQuery(studentId));
  const hasRec = Array.isArray(recorded.data) && recorded.data.includes(row.lesson_id);
  // ponytail: only rows of the month shown
  const [open, setOpen] = useState(() => linkedHere(row.lesson_id));
  if (!row.report_id && !hasRec) return null;
  return (
    <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={SUMMARY}>
        {row.report_id ? t.reports.view : t.studentRecordings.reportLink}
      </summary>
      {open && (
        <div ref={revealOnMount} className="grid w-[min(36rem,85vw)] gap-4 whitespace-normal pt-2">
          {row.report_id && <LessonReportView reportId={row.report_id} />}
          {hasRec && (
            <LessonRecording
              studentId={studentId}
              lessonId={row.lesson_id}
              startsAt={row.starts_at}
            />
          )}
        </div>
      )}
    </details>
  );
}
