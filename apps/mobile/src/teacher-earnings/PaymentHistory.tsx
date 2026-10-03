import type { TeacherPaymentView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { instantDay } from '@/payments/format';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { paymentLine } from './text';

function PaymentRow({ payment }: { payment: TeacherPaymentView }) {
  const { color } = useTheme();
  const meta = [instantDay(payment.paid_at), t.enums.paymentMethod[payment.method]];
  if (payment.from_payout) meta.push(t.teacherEarnings.fromPayout);
  return (
    <View style={{ gap: 2, padding: 12, borderBottomWidth: 1, borderBottomColor: color.rule, backgroundColor: color.raised }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
        {paymentLine(payment)}
      </AppText>
      <Note>{meta.join(' · ')}</Note>
      {payment.note ? <Note>{payment.note}</Note> : null}
    </View>
  );
}

/** «سجل المدفوعات»: payments newest first (read-only on both screens). */
export function PaymentHistory({ payments }: { payments: TeacherPaymentView[] }) {
  const { color } = useTheme();
  if (payments.length === 0) return <Note>{t.teacherEarnings.paymentsEmpty}</Note>;
  return (
    <View style={{ borderRadius: shape.radius.lg, borderWidth: 1, borderColor: color.rule, overflow: 'hidden' }}>
      {payments.map((p) => (
        <PaymentRow key={p.id} payment={p} />
      ))}
    </View>
  );
}
