import type { SalesTeacherView } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { countsLine } from '@/students/student-kinds';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';
import { teacherCounts, teacherLabel, teacherSubtitle } from './sales-text';

/**
 * One active teacher in «المعلمون» (web parity, owner report 2026-10-12): name, gender · programs, the
 * students and today's lessons as counts, «مشترك n · تجريبي n», «في حلقة الآن» (green: information,
 * never saffron). The row opens the teacher's students. Never pay, rates or phone; the fixed meeting
 * link only on the teacher's page.
 */
export function SalesTeacherRow({ teacher }: { teacher: SalesTeacherView }) {
  return (
    <ListRow
      title={teacherLabel(teacher)}
      subtitle={teacherSubtitle(teacher)}
      tags={
        <>
          <Note>{teacherCounts(teacher)}</Note>
          <Note>{countsLine(teacher)}</Note>
        </>
      }
      trailing={teacher.live_now ? <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} /> : undefined}
      onPress={() => router.push(`/more/sales/teachers/${teacher.id}`)}
    />
  );
}
