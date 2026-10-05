import type { PaymentView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { instantDay, money } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Ltr } from '@/ui/Ltr';
import { hasReceipt } from './receipt-file';
import { ReceiptViewer } from './ReceiptViewer';

/**
 * One payment or refund: the amount (refunds struck in saffron-free ink with the «استرداد» word),
 * student + code, method and day, who recorded it, then the receipt if there is one.
 */
export function PaymentItem({ payment }: { payment: PaymentView }) {
  const { color } = useTheme();
  const refund = payment.kind === 'refund';
  const line = [
    t.enums.paymentMethod[payment.method],
    instantDay(payment.paid_at),
    payment.recorded_by ? t.payments.recordedBy.replace('{name}', payment.recorded_by.full_name) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 };
  return (
    <View style={{ gap: 4, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.rule, backgroundColor: color.raised }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>
          {payment.student.name}
        </AppText>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink, fontVariant: ['tabular-nums'] }}>
          {`${refund ? `${t.enums.paymentKind.refund} ` : ''}${money(payment.amount, payment.currency)}`}
        </AppText>
      </View>
      <Ltr style={{ ...small, alignSelf: 'flex-start' }}>{payment.student.code}</Ltr>
      <AppText style={small}>{line}</AppText>
      {payment.note ? <AppText style={small}>{payment.note}</AppText> : null}
      {hasReceipt(payment) ? (
        <ReceiptViewer payment={payment} />
      ) : (
        <AppText style={{ ...small, color: color.ink3 }}>{t.mobileMoney.noReceipt}</AppText>
      )}
    </View>
  );
}
