import { Image, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import type { ReceiptChoice } from './transfer-form';

/** «تم اختيار الإيصال» (a photo's thumbnail beside it) and «غيّر الإيصال» to pick another. */
export function ChosenReceipt({ value, onClear }: { value: ReceiptChoice; onClear: () => void }) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={12} />
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
          {t.salesMoney.receiptChosen}
        </AppText>
      </View>
      {value.kind === 'file' ? (
        <Image
          source={{ uri: value.receipt.uri }}
          accessibilityLabel={t.salesMoney.receipt}
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
      <Button variant="secondary" label={t.salesMoney.receiptChange} onPress={onClear} />
    </View>
  );
}
