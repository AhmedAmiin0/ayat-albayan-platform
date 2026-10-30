import type { SavedReplyAttachment } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { AttachIcon, CrossIcon } from '../../shared/chat-icons';

/** The remove button is drawn dense (32pt) and stretched to the 44pt touch floor by hitSlop. */
const SLOP = (shape.control.touch - shape.control.dense) / 2;

/**
 * A picked reply's file, waiting above the reply row: its name, «يُرسل بعد النص» and a remove
 * button. One 32pt line (the button's 44pt hit area overhangs it), so the message list keeps its
 * reading space. Nothing is sent until «أرسل».
 */
export function SavedReplyChip({ file, onRemove }: { file: Pick<SavedReplyAttachment, 'name'>; onRemove: () => void }) {
  const { color } = useTheme();
  return (
    <View
      testID="saved-reply-chip"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: shape.control.dense, paddingStart: 10,
        borderRadius: shape.radius.md, backgroundColor: color.sunk,
      }}
    >
      <AttachIcon color={color.lapis} size={18} />
      <AppText numberOfLines={1} style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
        {file.name}
      </AppText>
      <AppText numberOfLines={1} style={{ flex: 1, fontFamily: type.ui[400], fontSize: type.size['2xs'], color: color.ink2 }}>
        {t.savedReplies.staged}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.savedReplies.stagedRemove.replace('{name}', file.name)}
        hitSlop={SLOP}
        onPress={onRemove}
        style={({ pressed }) => ({
          width: shape.control.dense, height: shape.control.dense, borderRadius: shape.radius.md,
          alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? color.lapisWash : 'transparent',
        })}
      >
        <CrossIcon color={color.ink2} size={18} />
      </Pressable>
    </View>
  );
}
