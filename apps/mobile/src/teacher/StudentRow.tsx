import { clockTime, lessonWhenText, studentStatusStyle, type TeacherStudentView } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';

/** «الحلقة الجاية: الأحد 5 أكتوبر 17:00» in the teacher's own time zone, or «مفيش حلقة جاية». */
export function nextLessonLine(startsAt: string | null, tz: string): string {
  if (!startsAt) return t.teacherStudents.noNextLesson;
  const at = new Date(startsAt);
  return t.teacherStudents.nextLesson.replace('{when}', `${lessonWhenText(at, tz, locale)} ${clockTime(at, tz)}`);
}

/**
 * One of my students: facts and next lesson; a tap opens their «سجل التقارير». A pending_renewal
 * student (still mine, lessons keep running) carries its «بانتظار التجديد» chip (owner 2026-10-12).
 */
export function StudentRow({ student: s, tz }: { student: TeacherStudentView; tz: string }) {
  const facts = [
    t.enums.program[s.program],
    s.level,
    s.age === null ? null : t.teacherStudents.age.replace('{n}', String(s.age)),
  ].filter((f): f is string => !!f);
  return (
    <ListRow
      title={s.name}
      meta={s.code}
      subtitle={`${facts.join(' · ')}\n${nextLessonLine(s.next_lesson_at, tz)}`}
      onPress={() => router.push(`/teacher/reports/student/${s.id}`)}
      trailing={
        s.status === 'pending_renewal' ? (
          <StatusChip {...studentStatusStyle.pending_renewal} label={t.enums.studentStatus.pending_renewal} size="sm" />
        ) : undefined
      }
    />
  );
}
