import type { SalesStudentDetails } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { studentStatusStyle } from '@ab/money';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import {
  useHolds,
  t,
  StatusChip,
  Button,
  BackButton,
  ltr,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { MessageSearchRow } from '@/inbox';
import { Note } from '@/more';
import { PeopleEditSection } from '@/students';
import { SalesChannelButton } from '@/student-file';
import { SalesLoadScreen } from '@/sales/sales/components/SalesLoadScreen';
import { familyChatHref } from '@/sales/sales/lib/sales-href';
import { fill } from '@/sales/sales/lib/sales-text';
import { MoneyActionButton } from '@/sales/sales/money-action';
import { AttendanceSection } from '@/sales/sales/student/AttendanceSection';
import { FamilySection } from '@/sales/sales/family/FamilySection';
import { PackageCancelAction } from '@/sales/sales/student/PackageCancelAction';
import { ReportsSection } from '@/sales/sales/student/ReportsSection';
import { ScheduleSection } from '@/sales/sales/student/ScheduleSection';
import { StudentCourseSection } from '@/sales/sales/student/course/StudentCourseSection';
import { SubscriptionSection } from '@/sales/sales/student/SubscriptionSection';
import { TrialSection } from '@/sales/sales/student/TrialSection';
import { useSalesStudent } from '@/sales/sales/student/student-api';

/** Under the name: the code · the guardian's phone; then the program · the teacher. */
function headLines({ code, guardian_phone: phone, program, teacher_name: teacher }: SalesStudentDetails['student']) {
  return {
    subtitle: [code, ...(phone ? [formatPhone(phone)] : [])].map(ltr).join(' · '),
    about: [t.enums.program[program], ...(teacher ? [fill(t.sales.student.teacher, { name: teacher })] : [])],
  };
}

/** Any student reads as hers (docs/16 row 36); `mine` absent in an old cache means hers. */
export function SalesStudentScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const student = useSalesStudent(id);
  // sales.renew_any (owner 2026-11-01): the money action of ANY student, not only hers.
  const renewsAny = useHolds('sales.renew_any');
  const data = student.data;
  if (!data) return <SalesLoadScreen title={t.sales.student.title} query={student} notFound={t.sales.student.notFound} />;
  const mine = data.mine !== false;
  // Money and the course's teacher / times (owner 2026-11-02): her student (`mine` follows the
  // ownership rule), ANY with sales.renew_any, as the API's own check.
  const acts = mine || renewsAny;
  const phone = data.student.guardian_phone;
  const status = data.student.status;
  const { about, subtitle } = headLines(data.student);
  return (
    <Screen>
      <ScreenHeader
        title={data.student.name}
        subtitle={subtitle}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ gap: 20 }}>
          <MessageSearchRow />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            <StatusChip {...studentStatusStyle[status]} label={t.enums.studentStatus[status]} size="sm" />
            <Note>{about.join(' · ')}</Note>
          </View>
          {phone ? (
            <Button variant="secondary" label={`${t.sales.student.chat} ${ltr(formatPhone(phone))}`} onPress={() => router.push(familyChatHref('/sales', phone))} />
          ) : null}
          <SalesChannelButton studentId={data.student.id} />
          {acts ? <MoneyActionButton student={{ id: data.student.id, name: data.student.name, phone }} /> : null}
          <FamilySection family={data.family} phone={phone} />
          <StudentCourseSection
            studentId={data.student.id}
            subscriptionId={data.current_id}
            acts={acts}
            schedule={data.schedule}
          />
          <PeopleEditSection studentId={data.student.id} onRemoved={() => router.back()} />
          <PackageCancelAction studentId={data.student.id} subscriptionId={data.current_id} />
          <TrialSection trial={data.trial} student={mine ? data.student : null} />
          <SubscriptionSection data={data} />
          <ScheduleSection schedule={data.schedule} />
          <AttendanceSection studentId={data.student.id} attendance={data.attendance} />
          <ReportsSection studentId={data.student.id} reports={data.reports} />
        </View>
      </ScrollView>
    </Screen>
  );
}
