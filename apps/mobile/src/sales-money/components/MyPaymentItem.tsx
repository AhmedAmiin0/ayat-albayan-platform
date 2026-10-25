import type { MyPaymentRow } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AttachmentsViewer } from '@/money/attachments/AttachmentsViewer';
import { hasAttachments } from '@/money/attachments/receipt-file';
import { instantDay, money } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Ltr } from '@/core/ui/primitives/Ltr';

/** One payment I recorded (web my-payment-columns): student and code, amount in its currency, kind · method · day, note, then «المرفقات» of a bank transfer. */
export function MyPaymentItem({ payment }: { payment: MyPaymentRow }) {
  const { color } = useTheme();
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 };
  const line = [t.enums.paymentKind[payment.kind], t.enums.paymentMethod[payment.method], instantDay(payment.paid_at)].join(' · ');
  return (
    <View style={{ gap: 4, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.rule, backgroundColor: color.raised }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.body, color: color.ink }}>{payment.student.name}</AppText>
        <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.body, color: color.ink, fontVariant: ['tabular-nums'] }}>
          {money(payment.amount, payment.currency)}
        </AppText>
      </View>
      <Ltr style={{ ...small, alignSelf: 'flex-start' }}>{payment.student.code}</Ltr>
      <AppText style={small}>{line}</AppText>
      {payment.note ? <AppText style={small}>{`${t.assistantPortal.payments.note}: ${payment.note}`}</AppText> : null}
      {hasAttachments(payment) ? (
        <AttachmentsViewer path={`/sales/me/payments/${payment.id}/attachments`} name={payment.student.name} />
      ) : null}
    </View>
  );
}
