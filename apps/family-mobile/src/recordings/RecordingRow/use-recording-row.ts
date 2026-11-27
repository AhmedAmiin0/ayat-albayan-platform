import { listenState, recordingMinutes } from '@ab/client-core';
import { counted } from '@ab/core';
import { teacherName } from '@ab/schedule';
import { clockOf } from '@ab/time';
import { router } from 'expo-router';
import { locale, t, useResumeMap } from '@ab/mobile-kit';
import type { RowNote } from '@/ui';
import { useFamilyClock } from '@/portal';
import { lessonHref } from '@/recordings/hrefs';
import { listenNote } from '@/recordings/listen-note';
import type { RecordingRowProps } from './RecordingRow.types';

export function useRecordingRow({
  row,
  student,
  parts,
}: Pick<RecordingRowProps, 'row' | 'student' | 'parts'>) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  const state = listenState(useResumeMap(), row.id);
  const teacher = row.teacher ? teacherName(row.teacher, locale) : '';
  const at = new Date(row.lesson_starts_at);
  const line = t.lessonFiles.rowMeta
    .replace('{teacher}', teacher)
    .replace('{time}', clockOf(at, clock))
    .replace('{minutes}', recordingMinutes(row.duration_seconds));
  const split: RowNote = { text: counted(t.lessonFiles.parts, parts), tone: 'quiet' };
  const notes: RowNote[] = [
    ...(parts > 1 ? [split] : []),
    { text: listenNote(state), tone: state.kind === 'new' ? 'link' : 'quiet' },
  ];
  const open = () => router.push(lessonHref({ studentId: student.id, lessonId: row.lesson_id }));
  return { clock, at, line, notes, open };
}
