import type { AttendanceTableRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { LessonRecording, recordedLessonIdsQuery } from '@/features/people/students';
import { LessonReportView } from '@ab/web-kit/report';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { revealOnMount } from '@/lib/dom/mount-refs';

// A secondary button; Safari still draws the disclosure triangle unless it is hidden.
const SUMMARY = [
  buttonVariants({ variant: 'secondary', size: 'sm' }),
  '[&::-webkit-details-marker]:hidden',
].join(' ');

// Sized from the page (@container), so an open row never pushes the table sideways.
const BODY = 'grid w-[85cqw] gap-4 whitespace-normal pt-2 sm:w-[min(36rem,55cqw)]';

type Row = Pick<AttendanceTableRow, 'lesson_id' | 'starts_at' | 'report_id'>;

export interface LessonDisclosureProps {
  row: Row;
  studentId: string;
}

/** An old recording link (#recording-<lesson id>) opens this lesson's row. */
const linkedHere = (lessonId: string): boolean =>
  window.location.hash === `#recording-${lessonId}`;

/** No reports tab (docs/49); nothing is fetched until a row opens; recordings by one id list. */
export function LessonDisclosure({ row, studentId }: LessonDisclosureProps) {
  const recorded = useQuery(recordedLessonIdsQuery(studentId));
  const hasRec = Array.isArray(recorded.data) && recorded.data.includes(row.lesson_id);
  // ponytail: only rows of the month shown
  const [open, setOpen] = useState(() => linkedHere(row.lesson_id));
  if (!row.report_id && !hasRec) return null;
  return (
    <details className="group" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className={SUMMARY}>
        {row.report_id ? t.reports.view : t.studentRecordings.reportLink}
        <Icon name="chevron-down" className="transition-transform group-open:rotate-180" />
      </summary>
      {open && (
        <div ref={revealOnMount} className={BODY}>
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
