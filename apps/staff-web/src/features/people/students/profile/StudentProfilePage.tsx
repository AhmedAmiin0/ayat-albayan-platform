import { formatPhone, isPackageEnded, secondPhoneOf, studentStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { Button, buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { Cartouche } from '@ab/web-kit/components/ui/display/cartouche';
import { Ltr } from '@ab/web-kit/components/ui/display/ltr';
import { PageHead } from '@ab/web-kit/components/ui/layout/page';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { EntityActivity } from '@/features/reporting/activity/EntityActivity';
import { BroughtByField } from '@/features/people/assistants/students/BroughtByField';
import { AssistantsManager } from '@/features/teaching/classroom/sessions/AssistantsManager';
import { StudentJoinLink } from '@/features/teaching/classroom/student-link/StudentJoinLink';
import { GuardianEditDialog } from '@/features/people/guardians/GuardianEditForm';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { studentQuery } from '@/features/people/students/api';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { BalanceCard } from '@/features/finance/subscriptions/balance/BalanceCard';
import { RenewSubscriptionButton } from '@/features/finance/subscriptions/create/RenewSubscriptionButton';
import { SiblingMerge } from '@/features/people/students/duplicates/SiblingMerge';
import { StudentInvoices } from './StudentInvoices';
import { StudentPayments } from './StudentPayments';
import { StudentProfileForm } from './StudentProfileForm';
import { StudentFamily } from '@/features/people/students/family/StudentFamily';
import { HeadActions } from '@ab/web-kit/components/ui/layout/head-actions';
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
  // The second number was linked from a lead chat and is removed from the guardian edit.
  const second = secondPhoneOf(student.guardian.phones);
  const chatPhone = student.guardian.phone_e164;
  const meta = [
    [t.students.code, <Ltr key="c">{student.code ?? '—'}</Ltr>],
    [t.students.guardian, (
      <Link key="g" to="/admin/inbox" search={{ page: 1, phone: student.guardian.phone_e164 }} className="text-lapis underline underline-offset-4">
        {student.guardian.name}
      </Link>
    )],
    [t.students.guardianPhone, <Ltr key="p">{formatPhone(student.guardian.phone_e164)}</Ltr>],
    ...(second ? [[t.guardians.secondPhone, <Ltr key="p2">{formatPhone(second)}</Ltr>] as const] : []),
    [
      t.students.effectiveLink,
      student.meeting_link ? (
        <a key="l" href={student.meeting_link} target="_blank" rel="noreferrer" dir="ltr"
          className="block truncate py-3 text-lapis underline underline-offset-4 sm:py-0">
          {student.meeting_link.replace(/^https?:\/\//, '')}
        </a>
      ) : (
        <span key="l">—</span>
      ),
    ],
  ] as const;
  const book = (
    <Link to="/admin/book" search={{ studentId: student.id }} className={buttonVariants({ variant: 'secondary' })}>
      {t.booking.open}
    </Link>
  );
  const ended = isPackageEnded(student.status);
  const head = headOf(ended, { renew: <RenewSubscriptionButton student={student} primary={ended} />, book });

  return (
    <>
      <PageHead className="mb-3">
        <Cartouche>{student.name}</Cartouche>
        <StatusChip {...studentStatusStyle[student.status]} label={t.enums.studentStatus[student.status]} />
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
      <dl className="mb-6 flex flex-wrap gap-x-7 gap-y-2 border-b border-rule pb-4 text-sm">
        {meta.map(([term, value]) => (
          <div key={term} className="flex min-w-0 items-baseline gap-2">
            <dt className="shrink-0 text-xs text-ink-3">{term}</dt>
            <dd className="min-w-0 truncate text-ink-2">{value}</dd>
          </div>
        ))}
      </dl>
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
