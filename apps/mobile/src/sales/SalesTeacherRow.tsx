import type { SalesTeacherView } from '@ab/shared';
import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { ListRow } from '@/ui/ListRow';
import { StatusChip } from '@/ui/StatusChip';
import { useSalesHrefs } from './sales-href';
import { teacherCounts, teacherLabel, teacherSubtitle } from './sales-text';

/**
 * One active teacher in «المعلمون» (web parity, owner report 2026-10-12): name, gender · programs, the
 * students and today's lessons as counts, «في حلقة الآن» (green: information, never saffron). The row
 * opens the teacher's students. Never pay, rates, phone or meeting link (the API does not send them).
 */
export function SalesTeacherRow({ teacher }: { teacher: SalesTeacherView }) {
  const href = useSalesHrefs();
  return (
    <ListRow
      title={teacherLabel(teacher)}
      subtitle={teacherSubtitle(teacher)}
      tags={<Note>{teacherCounts(teacher)}</Note>}
      trailing={teacher.live_now ? <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} /> : undefined}
      onPress={() => router.push(href.teacher(teacher.id))}
    />
  );
}
