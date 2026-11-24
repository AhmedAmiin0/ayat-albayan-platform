import type { SalesTeacherView, StudentListKind } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useViewerTz, zoneNote } from '@/core/lib/clock';
import { t, Button, FilterPills, StatusChip } from '@ab/mobile-kit';
import { usePlatformClassroom } from '@/core/lib/query/public-config';
import { Note } from '@/core/ui/feedback/Note';
import { kindPills } from '@/students/list/student-kinds';
import { useSalesHrefs } from '@/sales/sales/lib/sales-href';
import { teacherCounts } from '@/sales/sales/lib/sales-text';
import { TeacherMeetingLink } from './TeacherMeetingLink';

interface SalesTeacherHeaderProps {
  teacher: SalesTeacherView;
  kind: StudentListKind;
  onKind: (kind: StudentListKind) => void;
}

export function SalesTeacherHeader({ teacher, kind, onKind }: SalesTeacherHeaderProps) {
  const href = useSalesHrefs();
  const tz = useViewerTz();
  const platform = usePlatformClassroom(teacher.platform_classroom);
  const counts = { active: teacher.active_count, trial: teacher.trial_count, all: teacher.students.length };
  return (
    <View style={{ gap: 8, paddingBottom: 12, alignItems: 'flex-start' }}>
      <Note>{teacherCounts(teacher)}</Note>
      {teacher.live_now ? <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} /> : null}
      <Button
        variant="secondary"
        label={t.sales.teachers.openSchedule}
        onPress={() => router.push(href.schedule(teacher.id))}
      />
      <Note>{zoneNote(tz)}</Note>
      <TeacherMeetingLink link={teacher.meeting_link} platform={platform} />
      <FilterPills
        items={kindPills(counts)}
        value={kind}
        onChange={onKind}
        accessibilityLabel={t.studentLists.kinds}
      />
    </View>
  );
}
