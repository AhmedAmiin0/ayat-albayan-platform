import { isPackageEnded } from '@ab/shared';
import { studentStatusStyle } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import {
  Button,
  buttonVariants,
  Cartouche,
  PageHead,
  StatusChip,
  Toast,
  ApiError,
  t,
  FormAlert,
  HeadActions,
} from '@ab/web-kit';
import { EntityActivity } from '@/features/reporting/activity/EntityActivity';
import { BroughtByField } from '@/features/people/assistants/students/BroughtByField';
import { AssistantsManager } from '@/features/teaching/classroom/sessions/AssistantsManager';
import { StudentJoinLink } from '@/features/teaching/classroom/student-link/StudentJoinLink';
import { GuardianEditDialog } from '@/features/people/guardians/GuardianEditForm';
import { studentQuery } from '@/features/people/students/api';
import { BalanceCard } from '@/features/finance/subscriptions/balance/BalanceCard';
import { RenewSubscriptionButton } from '@/features/finance/subscriptions/create/RenewSubscriptionButton';
import { SiblingMerge } from '@/features/people/students/duplicates/SiblingMerge';
import { StudentInvoices } from '@/features/people/students/profile/StudentInvoices';
import { StudentPayments } from '@/features/people/students/profile/StudentPayments';
import { StudentProfileForm } from '@/features/people/students/profile/StudentProfileForm';
import { StudentMeta } from '@/features/people/students/profile/StudentMeta';
import { StudentFamily } from '@/features/people/students/family/StudentFamily';
import { PeopleEditActions, RemovedStudent } from '@/features/people/students/people-edit';
import { StudentRecordings } from '@/features/people/students/recordings/StudentRecordings';
import { CreateAccountButton } from '@/features/people/users/create/CreateAccountButton';
import { TrialDatesSection } from '@/features/teaching/booking/trial-date/TrialDatesSection';
import { MonitorChannel } from '@/features/teaching/student-channel';
import { usePermissions } from '@/features/people/auth';
import { CourseCardPanel } from '@/features/teaching/course-actions';
import { TestChip, TestFlagSwitch } from '@/features/people/test-accounts';

/** Renew leads the head only once the package ended; before that it sits in the overflow menu. */
const headOf = (ended: boolean, nodes: { renew: ReactNode; book: ReactNode }) =>
  ended ? { primary: nodes.renew, extra: nodes.book } : { primary: nodes.book, extra: nodes.renew };

/** R-STU-04, R-STU-05. */
export function StudentProfilePage({ studentId }: { studentId: string }) {
  const { data: student, error, isPending } = useQuery(studentQuery(studentId));
  const [editGuardian, setEditGuardian] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { can } = usePermissions();
  // Converting to a guardian removed this student row, so the file is gone.
  const [removed, setRemoved] = useState<string | null>(null);
  if (removed) return <RemovedStudent notice={removed} />;
  if (isPending) return <p className="text-ink-3">{t.common.loading}</p>;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <FormAlert>{notFound ? t.common.notFound : t.common.error}</FormAlert>;
  }
  const chatPhone = student.guardian.phone_e164;
  const book = (
    <Link to="/admin/book" search={{ studentId: student.id }} className={buttonVariants({ variant: 'secondary' })}>
      {t.booking.open}
    </Link>
  );
  const ended = isPackageEnded(student.status);
  const head = headOf(ended, {
    renew: <RenewSubscriptionButton student={student} primary={ended} />,
    book,
  });

  return (
    <>
      <PageHead className="mb-3">
        <Cartouche>{student.name}</Cartouche>
        <StatusChip
          {...studentStatusStyle[student.status]}
          label={t.enums.studentStatus[student.status]}
        />
        <TestChip when={student.is_test === true} />
        <HeadActions
          primary={head.primary}
          more={
            <>
              {head.extra}
              <Link to="/admin/students/$studentId/reports" params={{ studentId: student.id }} className={buttonVariants({ variant: 'secondary' })}>
                {t.reports.history}
              </Link>
              <Button type="button" variant="secondary" onClick={() => setEditGuardian(true)}>
                {t.guardians.edit}
              </Button>
              <CreateAccountButton student={student} />
            </>
          }
        />
      </PageHead>
      <PeopleEditActions studentId={student.id} onRemoved={setRemoved} />
      <StudentMeta student={student} />
      <StudentFamily siblings={student.siblings} contactIsSelf={student.contact_is_self ?? false} />
      <TrialDatesSection student={student} />
      <CourseCardPanel studentId={student.id} chatPhone={chatPhone} />
      <BalanceCard student={student} />
      <StudentPayments studentId={student.id} />
      <StudentInvoices studentId={student.id} />
      <StudentRecordings studentId={student.id} role="admin" />
      {can('student_channels.monitor') && <MonitorChannel studentId={student.id} audience="admin" />}
      <TestFlagSwitch target="student" row={student} enabled={can('students.write')} />
      <StudentProfileForm key={student.id} student={student} chatPhone={chatPhone} />
      <AssistantsManager studentId={student.id} />
      <BroughtByField studentId={student.id} />
      <StudentJoinLink studentId={student.id} />
      <SiblingMerge student={student} siblings={student.siblings} />
      <EntityActivity entity="students" entityId={student.id} hideEmpty />
      {editGuardian && (
        <GuardianEditDialog
          guardianId={student.guardian_id}
          onClose={() => setEditGuardian(false)}
          onDone={(text) => {
            setEditGuardian(false);
            setNotice(text);
          }}
        />
      )}
      {notice && <Toast message={notice} onDismiss={() => setNotice(null)} />}
    </>
  );
}
