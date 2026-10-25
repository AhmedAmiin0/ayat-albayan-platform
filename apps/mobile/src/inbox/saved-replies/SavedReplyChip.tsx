import type { SavedReplyAttachment } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { IconButton } from '@/ui/IconButton';
import { AttachIcon, CrossIcon } from '../chat-icons';

/**
 * A picked reply's file, waiting above the reply row: its name, «يُرسل بعد النص» and a 44pt remove
 * button. One compact line, so the box keeps its height. Nothing is sent until «أرسل».
 */
export function SavedReplyChip({ file, onRemove }: { file: Pick<SavedReplyAttachment, 'name'>; onRemove: () => void }) {
  const { color } = useTheme();
  return (
    <View
      testID="saved-reply-chip"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingStart: 10, borderRadius: shape.radius.md, backgroundColor: color.sunk }}
    >
      <AttachIcon color={color.lapis} size={18} />
      <AppText numberOfLines={1} style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
        {file.name}
      </AppText>
      <AppText numberOfLines={1} style={{ flex: 1, fontFamily: type.ui[400], fontSize: type.size['2xs'], color: color.ink2 }}>
        {t.savedReplies.staged}
      </AppText>
      <IconButton label={t.savedReplies.stagedRemove.replace('{name}', file.name)} onPress={onRemove}>
        <CrossIcon color={color.ink2} size={20} />
      </IconButton>
    </View>
  );
}
