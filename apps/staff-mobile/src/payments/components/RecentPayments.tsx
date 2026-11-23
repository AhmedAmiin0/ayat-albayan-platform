import type { PaymentView } from '@ab/shared';
import { View } from 'react-native';
import { t, type, useTheme, AppText, money } from '@ab/mobile-kit';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { instantDay } from '@/core/lib/money/format';
import { isPending } from '@/payments/lib/optimistic';
import { useRecentPayments } from '@/payments/hooks/queries';
import { useViewerTz } from '@/core/lib/clock';

function PaymentRow({ payment }: { payment: PaymentView }) {
  const tz = useViewerTz();
  const { color } = useTheme();
  const pending = isPending(payment);
  const detail = [
    t.enums.paymentMethod[payment.method],
    instantDay(payment.paid_at, tz),
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

/** Shows a pending row first, removed if the API refuses it; nothing if failed with no cache. */
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
