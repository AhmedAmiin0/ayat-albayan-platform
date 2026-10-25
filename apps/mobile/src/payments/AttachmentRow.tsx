import { Image, View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import type { Attachment } from './attachments';

export interface AttachmentRowProps {
  item: Attachment;
  /** 1-based, for «مرفق n». */
  n: number;
  /** The group's words: «مرفق {n}», «احذف المرفق». */
  text: { attachmentN: string; attachmentRemove: string };
  onRemove: () => void;
}

/** One chosen attachment: a photo's thumbnail (a dot for a chat file), «مرفق n», «احذف المرفق». */
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
      <Button variant="ghost" label={text.attachmentRemove} accessibilityLabel={`${text.attachmentRemove} · ${name}`} onPress={onRemove} />
    </View>
  );
}
