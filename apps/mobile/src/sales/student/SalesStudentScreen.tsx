import { formatPhone } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { CoursePauseSection } from '@/students';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SalesLoadScreen } from '../components/SalesLoadScreen';
import { familyChatHref } from '../lib/sales-href';
import { fill } from '../lib/sales-text';
import { AttendanceSection } from './AttendanceSection';
import { ReportsSection } from './ReportsSection';
import { ScheduleSection } from './ScheduleSection';
import { SubscriptionSection } from './SubscriptionSection';
import { TrialSection } from './TrialSection';
import { useSalesStudent } from './student-api';

/**
 * «تفاصيل الطالب» of the salesperson (docs/16 row 36): ANY student (owner 2026-10-28) — the trial first,
 * «الجدول» and the attendance of the past lessons; of HER students (`mine`, absent in an old cache = hers)
 * also the subscription (start, renewal / end, lessons used / left, past ones folded) and the sent reports
 * as the teacher sees them; move / cancel only on her students' lessons (the sheet checks `mine`).
 * Read-only, no money. Under the name: the code · the guardian's phone, and «فتح المحادثة» opens that
 * family's chat. An unknown id answers 404: «هذا الطالب غير موجود». «إيقاف مؤقت» (courses.pause) and its banner
 * for ANY student, as in the admin's file.
 */
export function SalesStudentScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const student = useSalesStudent(id);
  const data = student.data;
  if (!data) return <SalesLoadScreen title={t.sales.student.title} query={student} notFound={t.sales.student.notFound} />;
  const mine = data.mine !== false;
  const teacher = data.student.teacher_name;
  const phone = data.student.guardian_phone;
  const about = [t.enums.program[data.student.program], ...(teacher ? [fill(t.sales.student.teacher, { name: teacher })] : [])];
  return (
    <Screen>
      <ScreenHeader
        title={data.student.name}
        subtitle={[data.student.code, ...(phone ? [formatPhone(phone)] : [])].map(ltr).join(' · ')}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ gap: 20 }}>
          <Note>{about.join(' · ')}</Note>
          {phone ? (
            <Button variant="secondary" label={`${t.sales.student.chat} ${ltr(formatPhone(phone))}`} onPress={() => router.push(familyChatHref('/sales', phone))} />
          ) : null}
          {mine ? null : <Note>{t.sales.student.notMine}</Note>}
          <CoursePauseSection studentId={data.student.id} />
          <TrialSection trial={data.trial} />
          {mine ? <SubscriptionSection data={data} /> : null}
          <ScheduleSection schedule={data.schedule} studentId={data.student.id} />
          <AttendanceSection studentId={data.student.id} attendance={data.attendance} />
          {mine ? <ReportsSection studentId={data.student.id} reports={data.reports} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
