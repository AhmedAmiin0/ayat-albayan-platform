import { paymentInstructions } from '@ab/client-core';
import { EmptyState } from '@ab/web-kit/components/ui/display/empty-state';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { QueryState } from '@ab/web-kit/components/ui/display/query-state';
import { PaymentsList } from '@ab/web-kit/portal/package/PaymentsList';
import type { PackagePanelProps } from './PackagePanel.types';
import { PackageCard } from './PackageCard';
import { usePackagePanel } from './use-package-panel';

/** docs/50 §2: a guardian's or adult student's only; no WhatsApp link. */
export function PackagePanel({ student }: PackagePanelProps) {
  const { query } = usePackagePanel({ student });
  return (
    <QueryState query={query}>
      {(view) => {
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
      }}
    </QueryState>
  );
}
