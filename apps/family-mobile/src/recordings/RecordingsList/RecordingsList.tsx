import { partsByLesson, recordingMonths } from '@ab/client-core';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { MonthSection } from '@/ui';
import { RecordingRow } from '@/recordings/RecordingRow';
import type { RecordingsListProps } from './RecordingsList.types';
import { Empty } from './Empty';
import { firstPerLesson } from './recordings-list.helpers';

/**
 * The recordings by month, newest first, under the hint; one row per lesson. With none yet, only
 * the empty note (canvas RecXFamilyListEmpty): the hint would say the same twice.
 */
export function RecordingsList({ data, student }: RecordingsListProps) {
  const { color } = useTheme();
  const parts = partsByLesson(data.items);
  const firsts = firstPerLesson(data.items);
  if (firsts.length === 0) return <Empty name={student.name} />;
  return (
    <>
      <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>
        {t.lessonFiles.recordingsHint}
      </AppText>
      {recordingMonths(firsts, student.tz).map(({ month, rows }) => (
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
      ))}
    </>
  );
}
