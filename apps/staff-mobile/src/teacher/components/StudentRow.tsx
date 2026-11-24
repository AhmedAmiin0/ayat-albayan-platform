import { isPackageEnded, studentStatusStyle, type ClockCycle, type TeacherStudentView } from '@ab/shared';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { router } from 'expo-router';
import { t, ListRow, StatusChip } from '@ab/mobile-kit';

/** In the teacher's own time zone. */
function nextLessonLine(startsAt: string | null, tz: string, cycle: ClockCycle): string {
  if (!startsAt) return t.teacherStudents.noNextLesson;
  return t.teacherStudents.nextLesson.replace('{when}', whenIn(new Date(startsAt), tz, cycle));
}

/** A package-ended student is still hers and lessons keep running, so it shows a status chip. */
export function StudentRow({ student: s, tz }: { student: TeacherStudentView; tz: string }) {
  const cycle = useClockCycle();
  const facts = [
    t.enums.program[s.program],
    s.level,
    s.age === null ? null : t.teacherStudents.age.replace('{n}', String(s.age)),
  ].filter((f): f is string => !!f);
  return (
    <ListRow
      title={s.name}
      meta={s.code}
      subtitle={`${facts.join(' · ')}\n${nextLessonLine(s.next_lesson_at, tz, cycle)}`}
      onPress={() => router.push(`/teacher/reports/student/${s.id}`)}
      trailing={
        isPackageEnded(s.status) ? (
          <StatusChip {...studentStatusStyle[s.status]} label={t.enums.studentStatus[s.status]} size="sm" />
        ) : undefined
      }
    />
  );
}
