import { studentStatusStyle } from '@ab/shared';
import { Link } from '@tanstack/react-router';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import type { StudentRef } from '@/features/people/students/types';

export interface StudentFamilyProps {
  siblings: StudentRef[];
  /** «رقم الواتساب لـ: الطالب نفسه» (docs/30 §1). */
  contactIsSelf: boolean;
}

/**
 * «العائلة» on the student file (owner 2026-11-02), one compact line under the meta: «الطالب هو
 * صاحب رقم المحادثة» when they are, then the brothers and sisters (status, name, code), each a link
 * to that student's file. Nothing when there is neither.
 */
export function StudentFamily({ siblings, contactIsSelf }: StudentFamilyProps) {
  const f = t.students.family;
  if (siblings.length === 0 && !contactIsSelf) return null;
  return (
    <section aria-label={f.title} className="-mt-3 mb-6 flex flex-wrap items-center gap-x-2.5 gap-y-2 text-xs text-ink-2">
      <span className="font-semibold text-ink-3">{f.title}</span>
      {contactIsSelf && <span>{f.contactIsSelf}</span>}
      {siblings.length > 0 && <span>{`${f.siblings}:`}</span>}
      {siblings.map((s) => (
        <Link
          key={s.id}
          to="/admin/students/$studentId"
          params={{ studentId: s.id }}
          aria-label={f.openStudent.replace('{name}', s.name)}
          className="ab-lift inline-flex items-center gap-2 rounded-md border border-rule bg-raised py-[5px] ps-1.5 pe-2.5 font-semibold text-ink no-underline"
        >
          <StatusChip {...studentStatusStyle[s.status]} label={t.enums.studentStatus[s.status]} size="sm" />
          <span>{s.name}</span>
          <Ltr className="text-2xs font-medium text-ink-3">{s.code ?? '—'}</Ltr>
        </Link>
      ))}
    </section>
  );
}
