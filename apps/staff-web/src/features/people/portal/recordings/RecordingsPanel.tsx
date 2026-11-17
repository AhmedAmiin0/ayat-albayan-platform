import { partsByLesson, recordingMonths } from '@ab/client-core';
import { dateText, type PortalRecording, type PortalRecordings, type PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { LoadState } from '@/features/people/portal/LoadState';
import type { OpenReport } from '@/features/people/portal/report/ReportView';
import { LessonPanel } from './LessonPanel';
import { RecordingRowButton } from './RecordingRowButton';
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
  const parts = partsByLesson(data.items);
  if (rows.length === 0) {
    return (
      <EmptyState title={F.empty}>
        {`${F.emptyMeet.replace('{name}', student.name)} ${F.emptyRoom}`}
      </EmptyState>
    );
  }
  return (
    <div className="grid gap-5">
      <p className="text-sm text-ink-3">{F.recordingsHint}</p>
      {picked && (
        <LessonPanel key={picked} student={student} lessonId={picked} onOpenReport={onOpenReport} />
      )}
      {recordingMonths(rows, student.tz).map(({ month, rows: list }) => (
        <section key={month} aria-label={monthName(month)} className="grid gap-2">
          <h3 className="text-sm font-bold text-ink-2">{monthName(month)}</h3>
          {list.map((row) => (
            <RecordingRowButton
              key={row.id}
              row={row}
              student={student}
              parts={parts.get(row.lesson_id) ?? 1}
              picked={row.lesson_id === picked}
              onPick={() => setPicked(row.lesson_id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * «التسجيلات» (canvas RecXWebFamilyRecordings): the hint, the picked lesson's page, then all by
 * month; with none yet only the empty note (no hint above it).
 */
export function RecordingsPanel({ student, onOpenReport }: Props) {
  const query = useChildRecordings(student.id);
  return (
    <LoadState query={query}>
      {(data) => <List data={data} student={student} onOpenReport={onOpenReport} />}
    </LoadState>
  );
}
