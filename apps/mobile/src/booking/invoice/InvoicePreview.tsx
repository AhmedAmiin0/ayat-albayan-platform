import { Image, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { shape, type, useTheme } from '@/theme';
import { ReceiptIcon } from './ReceiptIcon';

interface InvoicePreviewProps {
  /** The photo, or the chat file's thumbnail; null shows a file tile instead. */
  uri: string | null;
  mime: string;
  /** Where it came from («اترفعت من الجهاز» / «من الشات»): in the tile and in the screen reader's label. */
  caption: string;
}

/**
 * The picked invoice: its picture whole (contain, so a receipt's amount and date are not cropped),
 * or a tile with the receipt icon («ملف PDF» / the source) when there is none. The screen reader
 * hears «الفاتورة، من الشات» (plus PDF).
 */
export function InvoicePreview({ uri, mime, caption }: InvoicePreviewProps) {
  const { color } = useTheme();
  const pdf = mime === 'application/pdf';
  const label = t.booking.mobile.invoiceA11y.replace('{source}', pdf ? `${caption} · ${t.booking.mobile.pdfFile}` : caption);
  const box = {
    width: 120,
    height: 160,
    borderRadius: shape.radius.md,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.sunk,
  };
  if (uri) {
    return <Image source={{ uri }} accessibilityLabel={label} accessibilityIgnoresInvertColors resizeMode="contain" style={box} />;
  }
  return (
    <View accessibilityLabel={label} style={{ ...box, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 }}>
      <ReceiptIcon size={32} />
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink, textAlign: 'center' }}>
        {pdf ? t.booking.mobile.pdfFile : caption}
      </AppText>
    </View>
  );
}
