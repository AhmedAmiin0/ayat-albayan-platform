import { familyChildren } from '@ab/client-core';
import type { PortalHome } from '@ab/shared';
import { useNavigate } from '@tanstack/react-router';
import { FamilyCard } from '@ab/web-kit/components/family/layout/FamilyCard';
import { IconTile } from '@ab/web-kit/components/family/layout/IconTile';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useFamilyPick, usePickChild } from '@/features/shell';
import { ChildCard } from './ChildCard';
import { WHO_ID, WhoHead } from './WhoHead';

/** The login's own WhatsApp number, an LTR island, named for screen readers. */
function PhoneLine({ phone }: { phone: string }) {
  return (
    <>
      <span className="sr-only">{t.familyLook.account.phone} </span>
      <bdi dir="ltr" className="font-latin">{phone}</bdi>
    </>
  );
}

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
    <FamilyCard as="section" tone="green" labelledBy={WHO_ID} className="grid gap-5">
      <WhoHead
        mark={<IconTile icon="users" size="lg" />}
        title={home.guardian?.name ?? t.portal.app.account.guardian}
        line={home.guardian && <PhoneLine phone={home.guardian.phone} />}
      />
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
