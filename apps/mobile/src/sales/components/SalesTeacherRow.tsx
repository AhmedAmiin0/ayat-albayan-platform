import type { SalesTeacherView } from '@ab/shared';
import { memo } from 'react';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { countsLine } from '@/students/list/student-kinds';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { useSalesHrefs } from '@/sales/lib/sales-href';
import { teacherCounts, teacherLabel, teacherSubtitle } from '@/sales/lib/sales-text';

/**
 * One active teacher in «المعلمون» (web parity, owner report 2026-10-12): name, gender · programs, the
 * students and today's lessons as counts, «مشترك n · تجريبي n», «في حلقة الآن» (green: information,
 * never saffron). The row opens the teacher's students. Never pay, rates or phone; the fixed meeting
 * link only on the teacher's page.
 */
export const SalesTeacherRow = memo(function SalesTeacherRow({ teacher }: { teacher: SalesTeacherView }) {
  const href = useSalesHrefs();
  const name = teacherLabel(teacher);
  return (
    <ListRow
      leading={<Avatar name={name} id={teacher.id} src={teacher.avatar_url} decorative />}
      title={name}
      subtitle={teacherSubtitle(teacher)}
      tags={
        <>
          <Note>{teacherCounts(teacher)}</Note>
          <Note>{countsLine(teacher)}</Note>
        </>
      }
      trailing={teacher.live_now ? <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} /> : undefined}
      onPress={() => router.push(href.teacher(teacher.id))}
    />
  );
});
