import { isPackageEnded, studentStatusStyle, type ClockCycle, type TeacherStudentView } from '@ab/shared';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';

/** «الحلقة الجاية: الأحد 5 أكتوبر 17:00» in the teacher's own time zone, or «مفيش حلقة جاية». */
function nextLessonLine(startsAt: string | null, tz: string, cycle: ClockCycle): string {
  if (!startsAt) return t.teacherStudents.noNextLesson;
  return t.teacherStudents.nextLesson.replace('{when}', whenIn(new Date(startsAt), tz, cycle));
}

/**
 * One of my students: facts and next lesson; a tap opens their «سجل التقارير». A package-ended
 * student (pending_renewal or expired: still mine, lessons keep running) carries its status chip
 * (owner 2026-10-12, 2026-10-15).
 */
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
