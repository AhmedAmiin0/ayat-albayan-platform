import { Image, View } from 'react-native';
import { shape, type, useTheme, AppText, Button, NuqtaGlyph } from '@ab/mobile-kit';
import type { Attachment } from './attachments';

interface AttachmentRowProps {
  item: Attachment;
  /** 1-based. */
  n: number;
  text: { attachmentN: string; attachmentRemove: string };
  onRemove: () => void;
}

export function AttachmentRow({ item, n, text, onRemove }: AttachmentRowProps) {
  const { color } = useTheme();
  const name = text.attachmentN.replace('{n}', String(n));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {item.kind === 'file' ? (
        <Image
          source={{ uri: item.receipt.uri }}
          accessibilityLabel={name}
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          style={{
            width: 48,
            height: 64,
            borderRadius: shape.radius.md,
            borderWidth: 1,
            borderColor: color.rule,
            backgroundColor: color.sunk,
          }}
        />
      ) : (
        <NuqtaGlyph shape="fill" color={color.ok} size={12} />
      )}
      <AppText style={{ flex: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>{name}</AppText>
      <View testID="attachment-remove" style={{ flex: 1 }}>
        <Button variant="danger" label={text.attachmentRemove} accessibilityLabel={`${text.attachmentRemove} · ${name}`} onPress={onRemove} />
      </View>
    </View>
  );
}
