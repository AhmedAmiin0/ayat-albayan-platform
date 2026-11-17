import { listenState } from '@ab/client-core';
import { teacherName, type PortalRecording, type PortalStudent } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { locale, t, useResumeMap } from '@ab/mobile-kit';
import { DateTile, PressCard, RowText, type RowNote } from '@/ui';
import { dayTile } from '@/lessons';
import { useFamilyClock } from '@/portal';
import { lessonHref } from './hrefs';
import { listenNote, minutesOf } from './listen-note';

interface RecordingRowProps {
  row: PortalRecording;
  student: PortalStudent;
  /** How many parts the lesson was recorded in (1 for most). */
  parts: number;
}

/** One recording (canvas RecXFamilyList): the day, the teacher and length, where you stopped. */
export function RecordingRow({ row, student, parts }: RecordingRowProps) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  const state = listenState(useResumeMap(), row.id);
  const teacher = row.teacher ? teacherName(row.teacher, locale) : '';
  const line = t.lessonFiles.rowMeta
    .replace('{teacher}', teacher)
    .replace('{minutes}', minutesOf(row.duration_seconds));
  const notes: RowNote[] = [
    ...(parts > 1 ? [{ text: t.lessonFiles.parts.replace('{n}', String(parts)), tone: 'quiet' as const }] : []),
    { text: listenNote(state), tone: state.kind === 'new' ? 'link' : 'quiet' },
  ];
  const open = () => router.push(lessonHref({ studentId: student.id, lessonId: row.lesson_id }));
  return (
    <PressCard label={t.lessonFiles.recording} onPress={open}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <DateTile {...dayTile(new Date(row.lesson_starts_at), clock)} />
        <RowText title={t.lessonFiles.recording} line={line} notes={notes} />
      </View>
    </PressCard>
  );
}
