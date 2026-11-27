import { Button } from '@ab/web-kit/components/ui/form/Button';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { NewReports } from '@ab/web-kit/portal/home/NewReports';
import { PackageLine } from '@ab/web-kit/portal/home/PackageLine';
import type { ChildCardProps } from './ChildCard.types';
import { CardLessons } from './CardLessons';
import { useChildCard } from './use-child-card';

/** One child on the guardian's home (docs/50 §6). */
export function ChildCard({ student, money, onOpen }: ChildCardProps) {
  const { lessons } = useChildCard({ student });
  return (
    <article
      aria-label={student.name}
      className="grid animate-fade-up gap-4 rounded-lg border border-rule bg-raised p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="grid gap-0.5">
          <h2 className="font-display text-h3 font-bold">{student.name}</h2>
          <p className="text-xs text-ink-3 tabular-nums">
            {t.portal.code.replace('{code}', student.code)}
          </p>
        </div>
        <NewReports studentId={student.id} />
      </header>
      <QueryState query={lessons} rows={2}>
        {(data) => <CardLessons lessons={data} student={student} />}
      </QueryState>
      {money && <PackageLine studentId={student.id} />}
      <Button type="button" variant="secondary" className="justify-self-start" onClick={onOpen}>
        {t.portal.openChild}
      </Button>
    </article>
  );
}
