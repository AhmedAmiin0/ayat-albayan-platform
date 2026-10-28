import type { SalesStudentRef } from '@ab/shared';
import { Ltr } from '@/components/ui/display/ltr';

/** A money row's student: the name, then the code as an LTR island («مدفوعاتي», «روابط الدفع»). */
export function StudentCell({ student }: { student: Pick<SalesStudentRef, 'name' | 'code'> }) {
  return (
    <span className="inline-flex items-baseline gap-3">
      <span className="font-semibold">{student.name}</span>
      <Ltr className="text-sm text-ink-2">{student.code}</Ltr>
    </span>
  );
}
