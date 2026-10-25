import type { TeacherPaymentView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { egp } from '../lib/format';

/** One payment made to the teacher: amount, method, day, and how many lessons it covered. */
export function PaymentItem({ payment }: { payment: TeacherPaymentView }) {
  const { color } = useTheme();
  const covers = payment.payout_id ? t.earnings.fromPayout : t.earnings.paymentSessions.replace('{count}', String(payment.sessions));
  const detail = [t.enums.paymentMethod[payment.method], instantDay(payment.paid_at), covers, payment.note].filter(Boolean).join(' · ');
  return (
    <View style={{ gap: 2, paddingVertical: 12 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {egp(payment.amount)}
      </AppText>
      <AppText style={{ fontFamily: type.ui[400], fontSize: type.size.xs, color: color.ink2 }}>{detail}</AppText>
    </View>
  );
}
