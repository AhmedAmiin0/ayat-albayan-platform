import { partsByLesson, recordingMonths } from '@ab/client-core';
import type { PortalRecordings, PortalStudent } from '@ab/shared';
import { AppText, EmptyState, t, type, useTheme } from '@ab/mobile-kit';
import { MonthSection } from '#/ui/index.ts';
import { RecordingRow } from './RecordingRow';

interface RecordingsListProps {
  data: PortalRecordings;
  student: PortalStudent;
}

/** «حلقات يوسف التي تُعقد على Google Meet لا تُسجَّل.», then when a recording shows up here. */
function Empty({ name }: { name: string }) {
  const { color } = useTheme();
  const note = { fontSize: type.size.sm, color: color.ink3, textAlign: 'center' as const };
  return (
    <>
      <EmptyState title={t.lessonFiles.empty} />
      <AppText style={note}>{t.lessonFiles.emptyMeet.replace('{name}', name)}</AppText>
      <AppText style={note}>{t.lessonFiles.emptyRoom}</AppText>
    </>
  );
}

/**
 * The recordings by month, newest first, under the hint; one row per lesson. With none yet, only
 * the empty note (canvas RecXFamilyListEmpty): the hint would say the same twice.
 */
export function RecordingsList({ data, student }: RecordingsListProps) {
  const { color } = useTheme();
  const parts = partsByLesson(data.items);
  const firsts = data.items.filter(
    (r, i, all) => all.findIndex((x) => x.lesson_id === r.lesson_id) === i,
  );
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
