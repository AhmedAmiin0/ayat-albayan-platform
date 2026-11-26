import type { SalesTeacherView } from '@ab/shared';
import { memo } from 'react';
import { router } from 'expo-router';
import { t, ListRow, StatusChip, Avatar } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { countsLine } from '@/students/list/student-kinds';
import { useSalesHrefs } from '@/sales/sales/lib/sales-href';
import { teacherCounts, teacherLabel, teacherSubtitle } from '@/sales/sales/lib/sales-text';

/** Never pay, rates or phone; the fixed meeting link only on the teacher's page. */
export const SalesTeacherRow = memo(function SalesTeacherRow({
  teacher,
}: {
  teacher: SalesTeacherView;
}) {
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
