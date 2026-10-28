import type { PaymentView } from '@ab/shared';
import { useState } from 'react';
import { ActivityIndicator, Image, Linking, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { useReceiptUrl } from '../shared/queries';
import { isPdfReceipt } from './receipt-file';

/** The opened receipt: a spinner, the failure, a PDF button, or the image whole (contain, nothing cropped). */
function ReceiptBody({ payment, open }: { payment: PaymentView; open: boolean }) {
  const { color } = useTheme();
  const file = useReceiptUrl(payment.id, open);
  const url = file.data?.url;
  if (!open) return null;
  if (file.isError) {
    return (
      <AppText accessibilityRole="alert" style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.bad }}>
        {t.mobileMoney.receiptFailed}
      </AppText>
    );
  }
  if (!url) return <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} />;
  if (isPdfReceipt(payment, url)) {
    return (
      <Button variant="secondary" label={t.mobileMoney.openPdf} onPress={() => void Linking.openURL(url)} />
    );
  }
  return (
    <Image
      source={{ uri: url }}
      accessibilityLabel={t.mobileMoney.receiptA11y.replace('{student}', payment.student.name)}
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      style={{
        width: '100%',
        height: 360,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.sunk,
      }}
    />
  );
}

/**
 * «عرض الإيصال»: asks for the signed URL only when opened. A PDF opens in the phone's own viewer
 * through Linking (no new native module); an image shows inline.
 */
export function ReceiptViewer({ payment }: { payment: PaymentView }) {
  const [open, setOpen] = useState(false);
  const label = open ? t.mobileMoney.hideReceipt : t.mobileMoney.viewReceipt;
  return (
    <View style={{ gap: 8 }}>
      <Button
        variant="secondary"
        label={label}
        accessibilityLabel={`${label} · ${payment.student.name}`}
        onPress={() => setOpen((v) => !v)}
      />
      <ReceiptBody payment={payment} open={open} />
    </View>
  );
}
