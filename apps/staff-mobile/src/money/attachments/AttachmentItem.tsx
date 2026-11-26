import { Image, Linking, View } from 'react-native';
import { t, shape, type, useTheme, AppText, Button } from '@ab/mobile-kit';
import type { AttachmentRow } from './attachments';

/** A PDF opens in the phone's own viewer (Linking); an image shows whole. */
export function AttachmentItem({ row }: { row: AttachmentRow }) {
  const { color } = useTheme();
  const { url } = row.view;
  if (row.pdf) {
    return (
      <Button variant="secondary" label={`${row.label} · ${t.mobileMoney.openPdf}`} onPress={() => void Linking.openURL(url)} />
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>
        {row.label}
      </AppText>
      <Image
        source={{ uri: url }}
        accessibilityLabel={row.label}
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
    </View>
  );
}
