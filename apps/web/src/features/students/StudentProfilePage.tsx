import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { studentQuery } from './api';
import { SiblingMerge } from './SiblingMerge';
import { StudentProfileForm } from './StudentProfileForm';

/** Student profile (R-STU-04, R-STU-05): identity, guardian, effective link, edit form, merge. */
export function StudentProfilePage({ studentId }: { studentId: string }) {
  const { data: student, error, isPending } = useQuery(studentQuery(studentId));

  if (isPending) return <p>{t.common.loading}</p>;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <p role="alert">{notFound ? t.common.notFound : t.common.error}</p>;
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">
          {student.name} <span className="text-muted-foreground">({student.code})</span>
        </h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t.students.guardian}</dt>
          <dd>{student.guardian.name}</dd>
          <dt className="text-muted-foreground">{t.students.guardianPhone}</dt>
          <dd><span dir="ltr">{student.guardian.phone_e164}</span></dd>
          <dt className="text-muted-foreground">{t.students.effectiveLink}</dt>
          <dd><span dir="ltr">{student.meeting_link ?? '—'}</span></dd>
        </dl>
      </header>
      <StudentProfileForm key={student.id} student={student} />
      <SiblingMerge student={student} siblings={student.siblings} />
    </section>
  );
}
