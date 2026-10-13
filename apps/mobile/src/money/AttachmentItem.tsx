import { Image, Linking, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import type { AttachmentRow } from './attachments';

/** One file of «المرفقات»: a PDF is a button to the phone's own viewer (Linking), an image shows whole. */
export function AttachmentItem({ row }: { row: AttachmentRow }) {
  const { color } = useTheme();
  const { url } = row.view;
  if (row.pdf) {
    return (
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="secondary" label={`${row.label} · ${t.mobileMoney.openPdf}`} onPress={() => void Linking.openURL(url)} />
      </View>
    );
  }
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink2 }}>{row.label}</AppText>
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
