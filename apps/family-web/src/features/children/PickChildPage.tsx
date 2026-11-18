import { familyChildren } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { Hero, HeroTitle } from '@ab/web-kit/family/layout/Hero';
import { PageBody } from '@ab/web-kit/family/layout/PageBody';
import { DiamondRule } from '@ab/web-kit/family/ornament/Diamond';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useFamilyPick, usePickChild } from '@/features/shell';
import { ChildSummaryCard } from './ChildSummaryCard';

/** The cards' top edges alternate (board PortalWebChildren). */
const TONES = ['green', 'gold'] as const;

/**
 * «اختر الطالب» (owner 2026-11-16, board PortalWebChildren): the title on the emerald hero, one
 * card per child (two columns on a wide screen), a guardian who studies first as «أنا»; a card
 * makes the pages that child's (saved in this browser) and goes home. Shown in place of the home
 * until a guardian of several picks (with the hint), and at /children to switch.
 */
export function PickChildPage({ home }: { home: PortalHome }) {
  const navigate = useNavigate();
  const pickChild = usePickChild();
  const first = useFamilyPick().state === 'choose';
  const choose = (studentId: string) => {
    pickChild(studentId);
    void navigate({ to: '/portal' });
  };
  return (
    <>
      <Hero labelledBy="pick-title">
        <HeroTitle id="pick-title" title={t.portal.app.pick.title} line={t.familyLook.child.pickLine} />
      </Hero>
      <PageBody>
        <div className="grid items-stretch gap-6 md:grid-cols-2 md:gap-8">
          {familyChildren(home).map((student, i) => (
            <ChildSummaryCard
              key={student.id}
              student={student}
              kind={home.kind}
              tone={TONES[i % TONES.length]}
              onChoose={() => choose(student.id)}
            />
          ))}
        </div>
        {first && (
          <div className="grid justify-items-center gap-3">
            <DiamondRule />
            <p className="text-center text-sm text-ink-3">{t.portal.app.pick.hint}</p>
          </div>
        )}
      </PageBody>
    </>
  );
}
