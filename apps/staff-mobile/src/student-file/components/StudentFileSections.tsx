import { router } from 'expo-router';
import { View } from 'react-native';
import { usePermissions, t, Button } from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';
import { CreateAccountButton } from '@/users/create/CreateAccountButton';
import { ContactIsSelfCard } from './ContactIsSelfCard';
import { JoinLinkCard } from './JoinLinkCard';
import { RecordingsButton } from '@/student-file/recordings/RecordingsButton';
import type { StudentProfile } from '@ab/shared';

/** Each section is hidden without its permission. */
export function StudentFileSections({ student }: { student: StudentProfile }) {
  const can = usePermissions();
  const to = useStudentHref();
  return (
    <View style={{ gap: 12 }}>
      <RecordingsButton href={to(`/students/recordings/${student.id}`)} />
      {can('payments.read') || can('invoices.read') ? (
        <Button variant="secondary" label={t.mobileStudentFile.money.button} onPress={() => router.push(to(`/students/money/${student.id}`))} />
      ) : null}
      {can('classroom.links') ? <JoinLinkCard studentId={student.id} studentName={student.name} /> : null}
      {can('students.write') ? <ContactIsSelfCard studentId={student.id} value={student.contact_is_self} /> : null}
      {can('student_channels.monitor') ? (
        <Button variant="secondary" label={t.studentChannel.monitorTitle} onPress={() => router.push(to(`/students/channel/${student.id}`))} />
      ) : null}
      <CreateAccountButton student={student} />
    </View>
  );
}
