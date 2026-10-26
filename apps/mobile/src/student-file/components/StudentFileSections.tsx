import { router } from 'expo-router';
import { View } from 'react-native';
import { usePermissions } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import type { StudentProfile } from '@/students/shared/types';
import { Button } from '@/core/ui/primitives/Button';
import { CreateAccountButton } from '@/users/create/CreateAccountButton';
import { ContactIsSelfCard } from './ContactIsSelfCard';
import { JoinLinkCard } from './JoinLinkCard';
import { RecordingsButton } from '../recordings/RecordingsButton';

/**
 * What the web student file has beyond the quick view: «تسجيلات الحلقات», «المدفوعات والفواتير»
 * (each opens its own screen), «رابط دخول الطالب», «رقم الواتساب لـ» (docs/30) and «إنشاء حساب». Each is hidden without its permission.
 */
export function StudentFileSections({ student }: { student: StudentProfile }) {
  const can = usePermissions();
  return (
    <View style={{ gap: 12 }}>
      <RecordingsButton href={`/students/recordings/${student.id}`} />
      {can('payments.read') || can('invoices.read') ? (
        <Button variant="secondary" label={t.mobileStudentFile.money.button} onPress={() => router.push(`/students/money/${student.id}`)} />
      ) : null}
      {can('classroom.links') ? <JoinLinkCard studentId={student.id} studentName={student.name} /> : null}
      {can('students.write') ? <ContactIsSelfCard studentId={student.id} value={student.contact_is_self} /> : null}
      <CreateAccountButton student={student} />
    </View>
  );
}
