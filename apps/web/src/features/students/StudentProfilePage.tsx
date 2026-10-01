import { studentStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/cartouche';
import { Ltr } from '@/components/ui/ltr';
import { PageHead } from '@/components/ui/page';
import { StatusChip } from '@/components/ui/status-chip';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { studentQuery } from './api';
import { FormAlert } from '@/components/ui/form-alert';
import { SiblingMerge } from './SiblingMerge';
import { StudentProfileForm } from './StudentProfileForm';

/**
 * Student profile (R-STU-04, R-STU-05) inside the shell's Page: the name is the cartouche, then
 * code / guardian / effective link, the edit form and the merge tool.
 */
export function StudentProfilePage({ studentId }: { studentId: string }) {
  const { data: student, error, isPending } = useQuery(studentQuery(studentId));

  if (isPending) return <p className="text-ink-3">{t.common.loading}</p>;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <FormAlert>{notFound ? t.common.notFound : t.common.error}</FormAlert>;
  }

  const meta = [
    [t.students.code, <Ltr key="c">{student.code ?? '—'}</Ltr>],
    [t.students.guardian, <span key="g">{student.guardian.name}</span>],
    [t.students.guardianPhone, <Ltr key="p">{student.guardian.phone_e164}</Ltr>],
    [
      t.students.effectiveLink,
      student.meeting_link ? (
        <a key="l" href={student.meeting_link} target="_blank" rel="noreferrer" dir="ltr"
          className="block truncate text-lapis underline underline-offset-4">
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
      </PageHead>
      <dl className="mb-6 flex flex-wrap gap-x-7 gap-y-2 border-b border-rule pb-4 text-sm">
        {meta.map(([term, value]) => (
          <div key={term} className="flex min-w-0 items-baseline gap-2">
            <dt className="shrink-0 text-xs text-ink-3">{term}</dt>
            <dd className="min-w-0 truncate text-ink-2">{value}</dd>
          </div>
        ))}
      </dl>
      <StudentProfileForm key={student.id} student={student} />
      <SiblingMerge student={student} siblings={student.siblings} />
    </>
  );
}
