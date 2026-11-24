import { useState } from 'react';
import { Image, View } from 'react-native';
import { t, shape, useTheme, Button, ErrorLine, FormLabel } from '@ab/mobile-kit';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { ButtonRow } from '@/core/ui/actions';
import { pickReceipt, type Receipt, type ReceiptSource } from '@/core/lib/receipts/receipt';

interface ReceiptPickerProps {
  receipt: Receipt | null;
  onChange: (receipt: Receipt) => void;
}

/** R-MOB-02: over the bucket's 10 MB is refused before upload; optional for cash. */
export function ReceiptPicker({ receipt, onChange }: ReceiptPickerProps) {
  const { color } = useTheme();
  const [error, setError] = useState<string>();
  const maxBytes = useUploadMaxBytes();
  const m = t.payments.mobile;

  async function pick(source: ReceiptSource) {
    setError(undefined);
    try {
      const picked = await pickReceipt(source);
      if (!picked) return;
      if (picked.size > maxBytes) setError(t.payments.error.receipt_too_large);
      else onChange(picked);
    } catch {
      setError(t.common.error);
    }
  }

  return (
    <View style={{ gap: 8 }}>
      <FormLabel>{t.payments.receipt}</FormLabel>
      {receipt ? (
        <Image
          source={{ uri: receipt.uri }}
          accessibilityLabel={t.payments.receipt}
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          style={{
            width: 120,
            height: 160,
            borderRadius: shape.radius.md,
            borderWidth: 1,
            borderColor: color.rule,
            backgroundColor: color.sunk,
          }}
        />
      ) : null}
      <ButtonRow>
        <Button variant="secondary" label={receipt ? m.retake : m.takePhoto} onPress={() => void pick('camera')} />
        <Button variant="secondary" label={m.pickPhoto} onPress={() => void pick('library')} />
      </ButtonRow>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
