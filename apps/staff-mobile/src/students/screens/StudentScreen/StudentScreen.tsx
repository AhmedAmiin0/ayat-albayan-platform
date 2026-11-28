import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { ScrollView } from 'react-native';
import { AssistantsSection } from '@/classroom/assistants/AssistantsSection';
import {
  ApiError,
  t,
  Button,
  BackButton,
  ErrorState,
  ltr,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';
import { MessageSearchRow } from '@/inbox';
import { StudentFileSections } from '@/student-file/components/StudentFileSections';
import { TrialDateSection } from '@/trial-date/components/TrialDateSection';
import { CourseCardSection } from '@/students/course-card/CourseCardSection';
import { RenewRow } from '@/students/course-card/RenewRow';
import { PeopleEditSection } from '@/students/people-edit/PeopleEditSection';
import { BalanceCard } from '@/students/profile/BalanceCard';
import { PayRow } from '@/students/profile/PayRow';
import { GuardianCard } from '@/students/profile/GuardianCard';
import { SiblingsList } from '@/students/profile/SiblingsList';
import { StatusChanger } from '@/students/profile/StatusChanger';
import { StudentFacts } from '@/students/profile/StudentFacts';
import { studentProfileQuery } from '@/students/profile-query';

const back = () => backWithin('/students');

/** Quick view (R-MOB-02): editing, adding and merging stay on the web. */
export function StudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery(studentProfileQuery(id));
  const student = query.data;
  const to = useStudentHref();
  const backButton = <BackButton onPress={back} />;

  if (!student) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <Screen>
        <ScreenHeader title={t.students.profile} size="h2" connecting leading={backButton} />
        {query.isError ? (
          <ErrorState
            onRetry={() => void query.refetch()}
            message={notFound ? t.common.notFound : undefined}
          />
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={student.name}
        size="h2"
        connecting
        subtitle={student.code ? ltr(student.code) : undefined}
        leading={backButton}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 20, paddingBottom: 32 }}>
        <MessageSearchRow />
        <StatusChanger student={student} chatPhone={student.guardian.phone_e164} />
        <CourseCardSection
          studentId={student.id}
          tree="admin"
          chatPhone={student.guardian.phone_e164}
          extra={
            <>
              <RenewRow student={student} />
              <PayRow studentId={student.id} />
            </>
          }
        />
        <Button
          variant="secondary"
          label={t.mobileAdmin.reports.button}
          onPress={() => router.push(to(`/students/reports/${student.id}`))}
        />
        <Button
          variant="secondary"
          label={t.sales.student.log.open}
          onPress={() => router.push(to(`/students/${student.id}/attendance`))}
        />
        <BalanceCard studentId={student.id} />
        <StudentFileSections student={student} />
        <TrialDateSection student={student} />
        <StudentFacts student={student} />
        <GuardianCard guardian={student.guardian} />
        <PeopleEditSection studentId={student.id} onRemoved={back} />
        <SiblingsList siblings={student.siblings} />
        <AssistantsSection studentId={student.id} />
      </ScrollView>
    </Screen>
  );
}
