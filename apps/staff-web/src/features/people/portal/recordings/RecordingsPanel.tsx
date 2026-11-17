import { listenState, listenText, recordingMonths } from '@ab/client-core';
import { dateText, type PortalRecording, type PortalRecordings, type PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { Button } from '@/components/ui/form/button';
import { useResumeMap } from '@/features/teaching/lesson-files';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { LessonWhen } from '@/features/people/portal/lessons/LessonWhen';
import { LoadState } from '@/features/people/portal/LoadState';
import type { OpenReport } from '@/features/people/portal/report/ReportView';
import { LessonPanel } from './LessonPanel';
import { useChildRecordings } from './use-recordings';

const F = t.lessonFiles;

interface Props {
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
}

const monthName = (month: string): string =>
  dateText(
    new Date(`${month}-01T00:00:00Z`),
    { tz: 'UTC', locale },
    { month: 'long', year: 'numeric' },
  );

/** One row per lesson (the newest part stands for it). */
const firstParts = (rows: readonly PortalRecording[]): PortalRecording[] =>
  rows.filter((r, i, all) => all.findIndex((x) => x.lesson_id === r.lesson_id) === i);

function List({ data, student, onOpenReport }: Props & { data: PortalRecordings }) {
  const rows = firstParts(data.items);
  const [picked, setPicked] = useState<string | null>(rows[0]?.lesson_id ?? null);
  const heard = useResumeMap();
  if (rows.length === 0) return <EmptyState title={F.empty}>{F.emptyHint}</EmptyState>;
  return (
    <div className="grid gap-5">
      {picked && (
        <LessonPanel key={picked} student={student} lessonId={picked} onOpenReport={onOpenReport} />
      )}
      {recordingMonths(rows, student.tz).map(({ month, rows: list }) => (
        <section key={month} aria-label={monthName(month)} className="grid gap-2">
          <h3 className="text-sm font-bold text-ink-2">{monthName(month)}</h3>
          {list.map((row) => (
            <Button
              key={row.id}
              type="button"
              variant="secondary"
              className="justify-between"
              aria-pressed={row.lesson_id === picked}
              onClick={() => setPicked(row.lesson_id)}
            >
              <LessonWhen startsAt={row.lesson_starts_at} tz={student.tz} />
              <span className="text-xs text-ink-3">{listenText(listenState(heard, row.id), F)}</span>
            </Button>
          ))}
        </section>
      ))}
    </div>
  );
}

/** «التسجيلات» (canvas RecXWebFamilyRecordings): the picked lesson's page, then all by month. */
export function RecordingsPanel({ student, onOpenReport }: Props) {
  const query = useChildRecordings(student.id);
  return (
    <div className="grid gap-4">
      <p className="text-sm text-ink-3">{F.recordingsHint}</p>
      <LoadState query={query}>
        {(data) => <List data={data} student={student} onOpenReport={onOpenReport} />}
      </LoadState>
    </div>
  );
}
