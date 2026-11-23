import { paymentInstructions } from '@ab/client-core';
import type { PortalPackageView, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, EmptyState, t, type, useTheme } from '@ab/mobile-kit';
import { LoadState } from '#/ui/index.ts';
import { useChildPackage } from '#/portal/index.ts';
import { PackageCard } from './PackageCard';
import { PaymentsList } from './PaymentsList';

/** The academy's transfer text and what happens after it (empty setting: nothing). */
function Instructions({ text }: { text: string }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {t.portal.paymentInstructions}
      </AppText>
      <AppText
        selectable
        style={{ padding: 12, borderRadius: 12, backgroundColor: color.sunk, color: color.ink2 }}
      >
        {text}
      </AppText>
      <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
        {t.portal.app.package.afterTransfer}
      </AppText>
    </View>
  );
}

/** The package, how to pay, the payments. */
function PackageView({ view, tz }: { view: PortalPackageView; tz: string }) {
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

/**
 * «الباقة» (docs/50 §2, canvas Package): a guardian's or an adult student's only (the caller
 * checks seesMoney): the package, the amount due, how to pay, the payments.
 */
export function PackageBody({ student }: { student: PortalStudent }) {
  const pkg = useChildPackage(student.id, true);
  return <LoadState query={pkg}>{(view) => <PackageView view={view} tz={student.tz} />}</LoadState>;
}
