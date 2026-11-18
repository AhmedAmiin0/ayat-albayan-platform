import type { PortalHome } from '@ab/shared';
import { Initial } from '@ab/web-kit/family/brand/Initial';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** A student login's card on «حسابي» (board PortalWebStudentAccount): initial, name and code. */
export function StudentCard({ home }: { home: PortalHome }) {
  const own = home.students[0];
  return (
    <FamilyCard as="section" tone="green" labelledBy="account-who">
      <div className="flex items-center gap-3.5">
        {own && <Initial name={own.name} size="md" />}
        <div className="grid min-w-0 gap-0.5">
          <h2 id="account-who" className="text-[24px] font-extrabold leading-snug text-ink">
            {own?.name ?? t.portal.app.tabs.account}
          </h2>
          {own && (
            <p className="text-sm text-ink-2">
              {t.portal.app.account.student.replace('{code}', own.code)}
            </p>
          )}
        </div>
      </div>
    </FamilyCard>
  );
}
