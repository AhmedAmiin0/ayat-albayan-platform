import { dayTile, listenState, recordingMinutes } from '@ab/client-core';
import type { PortalRecording, PortalStudent } from '@ab/shared';
import { counted } from '@ab/core';
import { teacherName } from '@ab/schedule';
import { clockOf } from '@ab/time';
import { router } from 'expo-router';
import { View } from 'react-native';
import { locale, t, useResumeMap } from '@ab/mobile-kit';
import { DateTile, PressCard, RowText, type RowNote } from '@/ui';
import { useFamilyClock } from '@/portal';
import { lessonHref } from '@/recordings/hrefs';
import { listenNote } from '@/recordings/listen-note';

interface RecordingRowProps {
  row: PortalRecording;
  student: PortalStudent;
  /** How many parts the lesson was recorded in (1 for most). */
  parts: number;
}

/** One recording (canvas RecXFamilyList): the day, teacher · time · length, where you stopped. */
export function RecordingRow({ row, student, parts }: RecordingRowProps) {
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
  return (
    <PressCard label={t.lessonFiles.recording} onPress={open}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <DateTile {...dayTile(at, clock)} />
        <RowText title={t.lessonFiles.recording} line={line} notes={notes} />
      </View>
    </PressCard>
  );
}
