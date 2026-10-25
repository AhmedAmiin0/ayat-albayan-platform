import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import type { StudentRef } from '@/features/students/types';
import { t } from '@/lib/i18n/i18n';

export interface DuplicateNoticeProps {
  candidates: readonly StudentRef[];
  /** Book the existing student instead (the lead still converts). */
  onUse: (student: StudentRef) => void;
  /** It really is a new child: create them anyway. */
  onNew: () => void;
}

/**
 * Lead path 409 duplicate_student (R-STU-03, R-LEAD-06, issue A1): the family is already on file
 * with a similar-named child, so booking would create a second copy of them.
 */
export function DuplicateNotice({ candidates, onUse, onNew }: DuplicateNoticeProps) {
  return (
    <section aria-labelledby="dup-title" className="grid gap-3 rounded-md bg-act-soft px-4 py-3.5">
      <div role="alert">
        <h3 id="dup-title" className="font-semibold">{t.students.duplicateTitle}</h3>
      </div>
      <p className="text-sm text-ink-2">{t.booking.duplicateNote}</p>
      <ul className="grid gap-2">
        {candidates.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">{s.name}</span>
            {s.code && <Ltr className="text-xs text-ink-3">{s.code}</Ltr>}
            <Button type="button" size="sm" className="ms-auto" onClick={() => onUse(s)}>
              {t.booking.bookExisting}
            </Button>
          </li>
        ))}
      </ul>
      <div className="border-t border-rule pt-3">
        <Button type="button" size="sm" variant="ghost" onClick={onNew}>
          {t.booking.newAnyway}
        </Button>
      </div>
    </section>
  );
}
