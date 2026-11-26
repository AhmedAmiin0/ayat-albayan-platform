import type { SalesStudentRef } from '@ab/shared';
import { Ltr } from '@ab/web-kit';

/** The code is rendered as an LTR island. */
export function StudentCell({ student }: { student: Pick<SalesStudentRef, 'name' | 'code'> }) {
  return (
    <span className="inline-flex items-baseline gap-3">
      <span className="font-semibold">{student.name}</span>
      <Ltr className="text-sm text-ink-2">{student.code}</Ltr>
    </span>
  );
}
