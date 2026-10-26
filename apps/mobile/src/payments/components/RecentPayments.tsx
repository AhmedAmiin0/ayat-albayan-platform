import type { PaymentView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SectionLabel } from '@/students/list/SectionLabel';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { instantDay, money } from '../format';
import { isPending } from '../lib/optimistic';
import { useRecentPayments } from '../hooks/queries';

function PaymentRow({ payment }: { payment: PaymentView }) {
  const { color } = useTheme();
  const pending = isPending(payment);
  const detail = [
    t.enums.paymentMethod[payment.method],
    instantDay(payment.paid_at),
    ...(pending ? [t.common.saving] : []),
  ].join(' · ');
  return (
    <View style={{ gap: 2, opacity: pending ? 0.6 : 1 }}>
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {money(payment.amount, payment.currency)}
      </AppText>
      <AppText
        style={{
          fontFamily: type.ui[400],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {detail}
      </AppText>
    </View>
  );
}

/**
 * «المدفوعات» on the student quick view: the latest 5 (P1). A payment being recorded shows here
 * first, faded with «جاري الحفظ…», and leaves again if the API refuses it (use-record-payment).
 * Nothing when the read failed with nothing cached.
 */
export function RecentPayments({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const items = useRecentPayments(studentId).data?.items;
  if (!items) return null;
  return (
    <View style={{ gap: 10 }}>
      <SectionLabel>{t.payments.title}</SectionLabel>
      {items.length === 0 ? (
        <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink3 }}>
          {t.payments.empty}
        </AppText>
      ) : (
        items.map((p) => <PaymentRow key={p.id} payment={p} />)
      )}
    </View>
  );
}
