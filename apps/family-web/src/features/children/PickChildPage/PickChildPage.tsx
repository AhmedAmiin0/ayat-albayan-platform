import { familyChildren } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { t } from '@ab/web-kit';
import { useFamilyPick, usePickChild } from '@/features/shell';
import { ChildSummaryCard } from '@/features/children/ChildSummaryCard';

/** Shown instead of home until a guardian of several picks; saved in this browser. */
export function PickChildPage({ home }: { home: PortalHome }) {
  const navigate = useNavigate();
  const pickChild = usePickChild();
  const first = useFamilyPick().state === 'choose';
  const choose = (studentId: string) => {
    pickChild(studentId);
    void navigate({ to: '/portal' });
  };
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
