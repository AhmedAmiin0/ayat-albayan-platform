import { familyChildren } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { IconTile } from '@ab/web-kit/family/layout/IconTile';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useFamilyPick, usePickChild } from '@/features/shell';
import { ChildCard } from './ChildCard';

/**
 * A guardian's card on «حسابي» (board PortalWebAccount): their own name and WhatsApp number (the
 * role word «ولي أمر» from an older API without them), then «الأبناء» as cards that switch
 * the child.
 */
export function GuardianCard({ home }: { home: PortalHome }) {
  const navigate = useNavigate();
  const pickChild = usePickChild();
  const pick = useFamilyPick();
  const shown = pick.state === 'one' ? pick.student.id : null;
  const choose = (studentId: string) => {
    pickChild(studentId);
    void navigate({ to: '/portal' });
  };
  return (
    <FamilyCard as="section" tone="green" labelledBy="account-who" className="grid gap-5">
      <div className="flex items-center gap-3.5">
        <IconTile icon="users" size="lg" />
        <div className="grid min-w-0 gap-0.5">
          <h2 id="account-who" className="text-[24px] font-extrabold leading-snug text-ink">
            {home.guardian?.name ?? t.portal.app.account.guardian}
          </h2>
          {home.guardian && (
            <p className="text-sm text-ink-2">
              <span className="sr-only">{t.familyLook.account.phone} </span>
              <bdi dir="ltr" className="font-latin">{home.guardian.phone}</bdi>
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-3">
        <h3 className="text-lg font-extrabold text-ink">{t.familyLook.account.children}</h3>
        <ul className="grid gap-2.5">
          {familyChildren(home).map((student, index) => (
            <li key={student.id}>
              <ChildCard student={student} index={index} current={student.id === shown}
                onChoose={() => choose(student.id)} />
            </li>
          ))}
        </ul>
      </div>
    </FamilyCard>
  );
}
