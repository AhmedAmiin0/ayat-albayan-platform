import type { PortalHome } from '@ab/shared';
import { Initial } from '@ab/web-kit/components/family/brand/Initial';
import { FamilyCard } from '@ab/web-kit/components/family/layout/FamilyCard';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { WHO_ID, WhoHead } from './WhoHead';

/** A student login's card on «حسابي» (board PortalWebStudentAccount): initial, name and code. */
export function StudentCard({ home }: { home: PortalHome }) {
  const own = home.students[0];
  return (
    <FamilyCard as="section" tone="green" labelledBy={WHO_ID}>
      <WhoHead
        mark={own && <Initial name={own.name} size="md" />}
        title={own?.name ?? t.portal.app.tabs.account}
        line={own && t.portal.app.account.student.replace('{code}', own.code)}
      />
    </FamilyCard>
  );
}
