import { partsByLesson, recordingMonths } from '@ab/client-core';
import type { PortalRecordings, PortalStudent } from '@ab/shared';
import { AppText, EmptyState, t, type, useTheme } from '@ab/mobile-kit';
import { MonthSection } from '@/ui';
import { RecordingRow } from './RecordingRow';

interface RecordingsListProps {
  data: PortalRecordings;
  student: PortalStudent;
}

/** The recordings by month, newest first; one row per lesson, or the «Meet» empty note. */
export function RecordingsList({ data, student }: RecordingsListProps) {
  const { color } = useTheme();
  const parts = partsByLesson(data.items);
  const firsts = data.items.filter(
    (r, i, all) => all.findIndex((x) => x.lesson_id === r.lesson_id) === i,
  );
  if (firsts.length === 0) {
    return (
      <>
        <EmptyState title={t.lessonFiles.empty} />
        <AppText style={{ fontSize: type.size.sm, color: color.ink3, textAlign: 'center' }}>
          {t.lessonFiles.emptyHint}
        </AppText>
      </>
    );
  }
  return recordingMonths(firsts, student.tz).map(({ month, rows }) => (
    <MonthSection key={month} month={month}>
      {rows.map((row) => (
        <RecordingRow
          key={row.id}
          row={row}
          student={student}
          parts={parts.get(row.lesson_id) ?? 1}
        />
      ))}
    </MonthSection>
  ));
}
