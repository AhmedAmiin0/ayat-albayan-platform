import { View } from 'react-native';
import { t } from '../../../lib/i18n/i18n';
import { shape, type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';

/**
 * «PDF», white on the brand green: beside the name, and large where page 1 is not shown (WhatsApp's
 * document glyph).
 */
export function PdfBadge({ large = false }: { large?: boolean }) {
  const { color } = useTheme();
  const size = large ? type.size.base : type.size['2xs'];
  return (
    <View
      style={{
        paddingHorizontal: large ? 12 : 6,
        paddingVertical: large ? 6 : 2,
        borderRadius: shape.radius.sm,
        backgroundColor: color.lapisFill,
      }}
    >
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: size,
          lineHeight: type.lineHeight(size),
          color: color.onLapis,
        }}
      >
        {t.inbox.pdf.type}
      </AppText>
    </View>
  );
}
