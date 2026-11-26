import { familyChildren } from '@ab/client-core';
import { t } from '@ab/web-kit';
import { ChildSummaryCard } from '@/features/children/ChildSummaryCard';
import type { PickChildPageProps } from './PickChildPage.types';
import { usePickChildPage } from './use-pick-child-page';

/** Shown instead of home until a guardian of several picks; saved in this browser. */
export function PickChildPage({ home }: PickChildPageProps) {
  const { first, choose } = usePickChildPage();
  return (
    <section aria-labelledby="pick-title" className="grid gap-4">
      <h1 id="pick-title" className="font-display text-h2 font-bold">
        {t.portal.app.pick.title}
      </h1>
      {familyChildren(home).map((student) => (
        <ChildSummaryCard
          key={student.id}
          student={student}
          kind={home.kind}
          onChoose={() => choose(student.id)}
        />
      ))}
      {first && <p className="text-center text-xs text-ink-3">{t.portal.app.pick.hint}</p>}
    </section>
  );
}
