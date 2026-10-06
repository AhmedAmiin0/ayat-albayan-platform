import { formatPhone, studentStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { Ltr } from '@/components/ui/ltr';
import { PageHead } from '@/components/ui/page';
import { StatusChip } from '@/components/ui/status-chip';
import { Toast } from '@/components/ui/toast';
import { EntityActivity } from '@/features/activity/EntityActivity';
import { BroughtByField } from '@/features/assistants/BroughtByField';
import { AssistantsManager } from '@/features/classroom/AssistantsManager';
import { StudentJoinLink } from '@/features/classroom/StudentJoinLink';
import { GuardianEditDialog } from '@/features/guardians/GuardianEditForm';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { studentQuery } from './api';
import { FormAlert } from '@/components/ui/form-alert';
import { BalanceCard } from '@/features/subscriptions/BalanceCard';
import { SiblingMerge } from './SiblingMerge';
import { StudentInvoices } from './StudentInvoices';
import { StudentPayments } from './StudentPayments';
import { StudentProfileForm } from './StudentProfileForm';
import { HeadActions } from '@/components/ui/head-actions';
import { StudentRecordings } from './StudentRecordings';

/**
 * Student profile (R-STU-04, R-STU-05) inside the shell's Page: the name is the cartouche, then
 * «سجل التقارير» and «احجز» links, code / guardian / effective link, the edit form and the merge tool.
 */
export function StudentProfilePage({ studentId }: { studentId: string }) {
  const { data: student, error, isPending } = useQuery(studentQuery(studentId));
  const [editGuardian, setEditGuardian] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  if (isPending) return <p className="text-ink-3">{t.common.loading}</p>;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <FormAlert>{notFound ? t.common.notFound : t.common.error}</FormAlert>;
  }

  const meta = [
    [t.students.code, <Ltr key="c">{student.code ?? '—'}</Ltr>],
    [t.students.guardian, <span key="g">{student.guardian.name}</span>],
    [t.students.guardianPhone, <Ltr key="p">{formatPhone(student.guardian.phone_e164)}</Ltr>],
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

  return (
    <>
      <PageHead className="mb-3">
        <Cartouche>{student.name}</Cartouche>
        <StatusChip {...studentStatusStyle[student.status]} label={t.enums.studentStatus[student.status]} />
        <HeadActions
          primary={
            <Link to="/admin/book" search={{ studentId: student.id }} className={buttonVariants({ variant: 'secondary' })}>
              {t.booking.open}
            </Link>
          }
          more={
            <>
              <Link to="/admin/students/$studentId/reports" params={{ studentId: student.id }} className={buttonVariants({ variant: 'secondary' })}>
                {t.reports.history}
              </Link>
              <Button type="button" variant="secondary" onClick={() => setEditGuardian(true)}>
                {t.guardians.edit}
              </Button>
            </>
          }
        />
      </PageHead>
      <dl className="mb-6 flex flex-wrap gap-x-7 gap-y-2 border-b border-rule pb-4 text-sm">
        {meta.map(([term, value]) => (
          <div key={term} className="flex min-w-0 items-baseline gap-2">
            <dt className="shrink-0 text-xs text-ink-3">{term}</dt>
            <dd className="min-w-0 truncate text-ink-2">{value}</dd>
          </div>
        ))}
      </dl>
      <BalanceCard student={student} />
      <StudentPayments studentId={student.id} />
      <StudentInvoices studentId={student.id} />
      <StudentRecordings studentId={student.id} role="admin" />
      <StudentProfileForm key={student.id} student={student} />
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
