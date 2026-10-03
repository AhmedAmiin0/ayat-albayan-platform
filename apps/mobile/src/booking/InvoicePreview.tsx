import { Image, View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/ui/AppText';
import { shape, type, useTheme } from '@/theme';

export interface InvoicePreviewProps {
  /** The photo, or the chat file's thumbnail; null shows a file tile instead. */
  uri: string | null;
  mime: string;
  /** Where it came from, for a tile with no picture. */
  caption: string;
}

/** The picked invoice: its picture, or a tile («ملف PDF» / «من الشات») when there is none. */
export function InvoicePreview({ uri, mime, caption }: InvoicePreviewProps) {
  const { color } = useTheme();
  const box = {
    width: 120,
    height: 160,
    borderRadius: shape.radius.md,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.sunk,
  };
  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessibilityLabel={t.booking.invoice.label}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        style={box}
      />
    );
  }
  return (
    <View accessibilityLabel={t.booking.invoice.label} style={{ ...box, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
        {mime === 'application/pdf' ? t.booking.mobile.pdfFile : caption}
      </AppText>
    </View>
  );
}
