import { memo } from 'react';
import type { PaymentView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { instantDay, money } from '@/core/lib/money/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { AttachmentsViewer } from '@/money/attachments/AttachmentsViewer';
import { hasAttachments } from '@/money/attachments/receipt-file';
import { ReceiptViewer } from '@/money/attachments/ReceiptViewer';
import { useViewerTz } from '@/core/lib/clock';

/**
 * One payment or refund: the amount (refunds struck in saffron-free ink with the «استرداد» word),
 * student + code, method and day, who recorded it, then its «المرفقات» (bank, or a stored receipt), the booking invoice, or «بلا إيصال».
 * The list's inset card draws the fill and the rule between payments (owner 2026-10-28).
 */
export const PaymentItem = memo(function PaymentItem({ payment }: { payment: PaymentView }) {
  const tz = useViewerTz();
  const { color } = useTheme();
  const refund = payment.kind === 'refund';
  // The booking invoice standing in for a receipt has its own viewer; any stored file is in «المرفقات».
  const invoiceOnly = payment.invoice_id !== null && payment.receipt_path === null;
  const files = hasAttachments(payment);
  const line = [
    t.enums.paymentMethod[payment.method],
    instantDay(payment.paid_at, tz),
    payment.recorded_by ? t.payments.recordedBy.replace('{name}', payment.recorded_by.full_name) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const small = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink2 };
  return (
    <View style={{ gap: 4, paddingHorizontal: 16, paddingVertical: 12 }}>
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
      {invoiceOnly ? <ReceiptViewer payment={payment} /> : null}
      {files ? <AttachmentsViewer path={`/payments/${payment.id}/attachments`} name={payment.student.name} /> : null}
      {!files && !invoiceOnly ? <AppText style={{ ...small, color: color.ink3 }}>{t.mobileMoney.noReceipt}</AppText> : null}
    </View>
  );
});
