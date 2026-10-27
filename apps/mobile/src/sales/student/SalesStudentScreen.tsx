import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SalesLoadScreen } from '../components/SalesLoadScreen';
import { fill } from '../lib/sales-text';
import { AttendanceSection } from './AttendanceSection';
import { ReportsSection } from './ReportsSection';
import { ScheduleSection } from './ScheduleSection';
import { SubscriptionSection } from './SubscriptionSection';
import { useSalesStudent } from './student-api';

/**
 * «تفاصيل الطالب» of the salesperson (owner 2026-10-27, docs/16 row 36): one of HER students — the
 * subscription (start, renewal / end, lessons used / left, past ones folded), the attendance of the
 * past lessons and the sent reports as the teacher sees them. Read-only, no money. Another student
 * answers 404: «هذا الطالب ليس من طلابك أو غير موجود».
 */
export function SalesStudentScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const student = useSalesStudent(id);
  const data = student.data;
  if (!data) return <SalesLoadScreen title={t.sales.student.title} query={student} notFound={t.sales.student.notFound} />;
  const teacher = data.student.teacher_name;
  const about = [t.enums.program[data.student.program], ...(teacher ? [fill(t.sales.student.teacher, { name: teacher })] : [])];
  return (
    <Screen>
      <ScreenHeader
        title={data.student.name}
        subtitle={ltr(data.student.code)}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ gap: 20 }}>
          <Note>{about.join(' · ')}</Note>
          <SubscriptionSection data={data} />
          <ScheduleSection schedule={data.schedule} />
          <AttendanceSection attendance={data.attendance} />
          <ReportsSection studentId={data.student.id} reports={data.reports} />
        </View>
      </ScrollView>
    </Screen>
  );
}
