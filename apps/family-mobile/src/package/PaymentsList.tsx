import { signedAmount } from '@ab/client-core';
import type { PortalPayment } from '@ab/shared';
import { dateText } from '@ab/time';
import { View } from 'react-native';
import { AppText, InsetGroup, locale, money, t, type, useTheme } from '@ab/mobile-kit';

const KIND_WORD: Record<PortalPayment['kind'], () => string> = {
  payment: () => t.portal.app.package.paid,
  refund: () => t.portal.app.package.refund,
};

/** Payments are listed newest first. */
export function PaymentsList({ payments, tz }: { payments: readonly PortalPayment[]; tz: string }) {
  const { color } = useTheme();
  if (payments.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink }}>
        {t.portal.payments}
      </AppText>
      <InsetGroup>
        {payments.map((p, i) => (
          <View
            key={`${p.paid_at}-${p.amount}-${i}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <AppText style={{ fontFamily: type.ui[700], color: color.ink }}>
                {money(signedAmount(p), p.currency)}
              </AppText>
              <AppText style={{ fontSize: type.size.xs, color: color.ink3 }}>
                {dateText(
                  new Date(p.paid_at),
                  { tz, locale },
                  { day: 'numeric', month: 'long', year: 'numeric' },
                )}
              </AppText>
            </View>
            <AppText
              style={{
                fontFamily: type.ui[600],
                fontSize: type.size.xs,
                color: p.kind === 'refund' ? color.act : color.ok,
              }}
            >
              {KIND_WORD[p.kind]()}
            </AppText>
          </View>
        ))}
      </InsetGroup>
    </View>
  );
}
