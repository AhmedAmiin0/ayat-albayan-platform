import type { SalesTeacherView, StudentListKind } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { kindPills } from '@/students/student-kinds';
import { Button } from '@/ui/Button';
import { FilterPills } from '@/ui/FilterPills';
import { StatusChip } from '@/ui/StatusChip';
import { teacherCounts } from './sales-text';
import { TeacherMeetingLink } from './TeacherMeetingLink';

export interface SalesTeacherHeaderProps {
  teacher: SalesTeacherView;
  kind: StudentListKind;
  onKind: (kind: StudentListKind) => void;
}

/**
 * The top of a sales teacher's page, scrolling with the list: counts, «في حلقة الآن», the read-only
 * schedule, «رابط الحلقة الثابت» and the «مشترك · تجريبي · الكل» switch («الكل» = paused too).
 */
export function SalesTeacherHeader({ teacher, kind, onKind }: SalesTeacherHeaderProps) {
  const counts = { active: teacher.active_count, trial: teacher.trial_count, all: teacher.students.length };
  return (
    <View style={{ gap: 8, paddingHorizontal: 16, paddingBottom: 8, alignItems: 'flex-start' }}>
      <Note>{teacherCounts(teacher)}</Note>
      {teacher.live_now ? <StatusChip tone="ok" glyph="fill" size="sm" label={t.sales.teachers.liveNow} /> : null}
      <Button
        variant="secondary"
        label={t.sales.teachers.openSchedule}
        onPress={() => router.push({ pathname: '/more/sales/schedule', params: { teacherId: teacher.id } })}
      />
      <Note>{t.schedule.riyadhTime}</Note>
      <TeacherMeetingLink link={teacher.meeting_link} />
      <FilterPills
        items={kindPills(counts)}
        value={kind}
        onChange={onKind}
        accessibilityLabel={t.studentLists.kinds}
      />
    </View>
  );
}
