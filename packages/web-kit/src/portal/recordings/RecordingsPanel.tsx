import { partsByLesson, recordingMonths } from '@ab/client-core';
import { dateText, type PortalRecording, type PortalRecordings, type PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { MonthDiamond } from '@ab/web-kit/family/panels/MonthDiamond';
import { FAM_EMPTY, FAM_MONTH, FAM_SIDE, FAM_SPLIT } from '@ab/web-kit/family/panels/panel-look';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { cn } from '@ab/web-kit/lib/utils';
import { LoadState } from '@ab/web-kit/portal/LoadState';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';
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
      <EmptyState title={F.empty} className={FAM_EMPTY}>
        {`${F.emptyMeet.replace('{name}', student.name)} ${F.emptyRoom}`}
      </EmptyState>
    );
  }
  return (
    <div className={cn('grid gap-5', FAM_SPLIT)}>
      <p className="text-sm text-ink-3 family:text-[15px] family:lg:col-span-2">{F.recordingsHint}</p>
      {picked && (
        <LessonPanel key={picked} student={student} lessonId={picked} onOpenReport={onOpenReport} />
      )}
      <div className={FAM_SIDE}>
        {recordingMonths(rows, student.tz).map(({ month, rows: list }) => (
          <section key={month} aria-label={monthName(month)} className="grid gap-2 family:gap-3">
            <h3 className={cn('text-sm font-bold text-ink-2', FAM_MONTH)}>
              <MonthDiamond />
              {monthName(month)}
            </h3>
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
