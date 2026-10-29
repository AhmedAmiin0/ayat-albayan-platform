import type { SalesChatReceipt } from '@ab/shared';
import { Image, View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { useChatReceiptThumb } from './chat-receipts';

const SIZE = 56;

/** The image's signed thumbnail once it answers; a PDF (or a file not loaded) is a labelled box. */
export function ChatReceiptThumb({ studentId, item, bind }: { studentId: string; item: SalesChatReceipt; bind?: { phone?: string } }) {
  const { color } = useTheme();
  const file = useChatReceiptThumb(studentId, item, bind);
  const box = {
    width: SIZE,
    height: SIZE,
    borderRadius: shape.radius.md,
    borderWidth: 1,
    borderColor: color.rule,
    backgroundColor: color.sunk,
  };
  if (file.data) {
    return (
      <Image
        source={{ uri: file.data.url }}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        style={box}
      />
    );
  }
  return (
    <View style={{ ...box, alignItems: 'center', justifyContent: 'center' }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink3 }}>
        {item.mime === 'application/pdf' ? 'PDF' : ''}
      </AppText>
    </View>
  );
}
