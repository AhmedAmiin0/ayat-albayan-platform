import type { SalesStudentView } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { Note } from '@/more';
import { rosterAttendanceLine, rosterPackageLine, rosterScheduleLine } from './roster-text';

type RosterStudent = Pick<SalesStudentView, 'weekly' | 'attendance' | 'package'>;

/**
 * Under a student row's lines (owner 2026-10-30): the current package (no price), the weekly
 * schedule in one short line and the attendance count, each on its own full-width line. Nothing
 * from an old cache without them.
 */
export function RosterLines({ student }: { student: RosterStudent }) {
  const cycle = useClockCycle();
  const lines = [
    rosterPackageLine(student),
    rosterScheduleLine(student, cycle),
    rosterAttendanceLine(student),
  ].filter((l) => l !== null);
  if (lines.length === 0) return null;
  return (
    <View testID="roster-lines" style={{ width: '100%', gap: 2 }}>
      {lines.map((line) => (
        <Note key={line}>{line}</Note>
      ))}
    </View>
  );
}
