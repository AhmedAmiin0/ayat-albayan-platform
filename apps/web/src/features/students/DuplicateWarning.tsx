import { Button } from '@/components/ui/button';
import { t } from '@/lib/i18n';
import type { StudentRef } from './types';

type DuplicateWarningProps = {
  candidates: StudentRef[];
  onMerge: (candidate: StudentRef) => void;
  onCreateAnyway: () => void;
};

/** R-STU-03: same phone + similar name — offer merge, or create a sibling anyway. */
export function DuplicateWarning({ candidates, onMerge, onCreateAnyway }: DuplicateWarningProps) {
  return (
    <section role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/50 p-3">
      <h3 className="font-semibold">{t.students.duplicateTitle}</h3>
      <p className="text-sm">{t.students.duplicateWarning}</p>
      <p className="text-sm text-muted-foreground">{t.students.duplicateCandidates}</p>
      <ul className="flex flex-col gap-2">
        {candidates.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2">
            <span>
              {c.name} <span className="text-muted-foreground">({c.code})</span> —{' '}
              {t.enums.studentStatus[c.status]}
            </span>
            <Button size="sm" onClick={() => onMerge(c)}>
              {t.students.merge}
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" onClick={onCreateAnyway}>
        {t.students.createAnyway}
      </Button>
    </section>
  );
}
