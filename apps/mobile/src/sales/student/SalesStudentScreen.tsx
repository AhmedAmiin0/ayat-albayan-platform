import { formatPhone, studentStatusStyle, type SalesStudentDetails } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { CoursePauseSection } from '@/students';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SalesLoadScreen } from '../components/SalesLoadScreen';
import { familyChatHref } from '../lib/sales-href';
import { fill } from '../lib/sales-text';
import { MoneyActionButton } from '../money-action';
import { PackageSection } from './PackageSection';
import { AttendanceSection } from './AttendanceSection';
import { ReportsSection } from './ReportsSection';
import { ScheduleSection } from './ScheduleSection';
import { SubscriptionSection } from './SubscriptionSection';
import { TrialSection } from './TrialSection';
import { useSalesStudent } from './student-api';

/** Under the name: the code · the guardian's phone; then the program · the teacher. */
function headLines({ code, guardian_phone: phone, program, teacher_name: teacher }: SalesStudentDetails['student']) {
  return {
    subtitle: [code, ...(phone ? [formatPhone(phone)] : [])].map(ltr).join(' · '),
    about: [t.enums.program[program], ...(teacher ? [fill(t.sales.student.teacher, { name: teacher })] : [])],
  };
}

/**
 * «تفاصيل الطالب» of the salesperson (docs/16 row 36): ANY student (owner 2026-10-28) — the trial first,
 * «الجدول» and the attendance of the past lessons; of HER students (`mine`, absent in an old cache = hers)
 * also the subscription (start, renewal / end, lessons used / left, past ones folded) and the sent reports
 * as the teacher sees them; move / cancel only on her students' lessons (the sheet checks `mine`).
 * Of ANY student the status chip and the current package (owner 2026-10-30: size, status, dates,
 * lessons used / left; PackageSection for another's). No price or payment shown. Under the name: the code · the guardian's phone, and «فتح المحادثة» opens that
 * family's chat; under it (it loads after the page: nothing shifts) the one money action of hers (UX review #9: «تسجيل تحويل» / «تجديد»). An unknown id answers 404: «هذا الطالب غير موجود». «إيقاف مؤقت» (courses.pause) and its banner
 * for ANY student, as in the admin's file.
 */
export function SalesStudentScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const student = useSalesStudent(id);
  const data = student.data;
  if (!data) return <SalesLoadScreen title={t.sales.student.title} query={student} notFound={t.sales.student.notFound} />;
  const mine = data.mine !== false;
  const phone = data.student.guardian_phone;
  const status = data.student.status;
  const { about, subtitle } = headLines(data.student);
  return (
    <Screen>
      <ScreenHeader
        title={data.student.name}
        subtitle={subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <StatusChip {...studentStatusStyle[status]} label={t.enums.studentStatus[status]} size="sm" />
            <Note>{about.join(' · ')}</Note>
          </View>
          {phone ? (
            <Button variant="secondary" label={`${t.sales.student.chat} ${ltr(formatPhone(phone))}`} onPress={() => router.push(familyChatHref('/sales', phone))} />
          ) : null}
          {mine ? <MoneyActionButton student={{ id: data.student.id, name: data.student.name, phone }} /> : <Note>{t.sales.student.notMine}</Note>}
          <CoursePauseSection studentId={data.student.id} />
          <TrialSection trial={data.trial} student={mine ? data.student : null} />
          {mine ? <SubscriptionSection data={data} /> : <PackageSection summary={data.package} />}
          <ScheduleSection schedule={data.schedule} studentId={data.student.id} />
          <AttendanceSection studentId={data.student.id} attendance={data.attendance} />
          {mine ? <ReportsSection studentId={data.student.id} reports={data.reports} /> : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
