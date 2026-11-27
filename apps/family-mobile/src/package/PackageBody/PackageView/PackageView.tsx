import { paymentInstructions } from '@ab/client-core';
import { EmptyState, t } from '@ab/mobile-kit';
import { PackageCard } from '@/package/PackageCard';
import { PaymentsList } from '@/package/PaymentsList';
import { Instructions } from './Instructions';
import type { PackageViewProps } from './PackageView.types';

/** The package, how to pay, the payments. */
export function PackageView({ view, tz }: PackageViewProps) {
  const text = paymentInstructions(view);
  return (
    <>
      {view.package ? (
        <PackageCard pkg={view.package} />
      ) : (
        <EmptyState title={t.portal.packageEmpty} />
      )}
      {text ? <Instructions text={text} /> : null}
      <PaymentsList payments={view.payments} tz={tz} />
    </>
  );
}
