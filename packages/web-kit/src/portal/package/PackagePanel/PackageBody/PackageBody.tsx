import { paymentInstructions } from '@ab/client-core';
import type { PortalPackageView } from '@ab/shared';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PaymentsList } from '@ab/web-kit/portal/package/PaymentsList';
import { PackageCard } from '@ab/web-kit/portal/package/PackagePanel/PackageCard';

export function PackageBody({ view }: { view: PortalPackageView }) {
  const instructions = paymentInstructions(view);
  return (
    <div className="grid gap-4">
      {view.package ? (
        <PackageCard pkg={view.package} />
      ) : (
        <EmptyState title={t.portal.packageEmpty}>{t.portal.packageEmptyHint}</EmptyState>
      )}
      <PaymentsList payments={view.payments} />
      {instructions && (
        <section aria-label={t.portal.paymentInstructions} className="grid gap-1">
          <h3 className="text-sm font-semibold text-ink-2">{t.portal.paymentInstructions}</h3>
          <p className="whitespace-pre-line rounded-lg bg-sunk p-3 text-sm">{instructions}</p>
        </section>
      )}
    </div>
  );
}
