import type { StickerItem } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Image, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { threadFileQuery } from '@/inbox/messages/hooks/thread-file';

/** A sticker's cell in the panel (WhatsApp's are 512×512 WebP, shown uncut). */
const CELL = 72;

/** One sticker, signed through the chat that holds it (the same cache as its bubble). */
function StickerCell({ item, onPick }: { item: StickerItem; onPick: (item: StickerItem) => void }) {
  const { color } = useTheme();
  const file = useQuery(threadFileQuery(item.phone, item.message_id));
  const uri = file.data?.url;
  return (
    <Pressable
      testID={`sticker-${item.message_id}`}
      accessibilityRole="button"
      accessibilityLabel={t.inbox.composer.stickerSend}
      disabled={!uri}
      onPress={() => onPick(item)}
      style={({ pressed }) => ({
        width: CELL,
        height: CELL,
        borderRadius: shape.radius.md,
        backgroundColor: pressed ? color.lapisWash : 'transparent',
      })}
    >
      {uri ? <Image source={{ uri }} resizeMode="contain" style={{ flex: 1 }} /> : null}
    </Pressable>
  );
}

interface StickerRowProps {
  title: string;
  items: readonly StickerItem[];
  onPick: (item: StickerItem) => void;
}

/** «المفضلة» or «الأحدث»: a title over a wrapping grid; nothing at all when empty. */
export function StickerRow({ title, items, onPick }: StickerRowProps) {
  const { color } = useTheme();
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 4 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink3 }}>
        {title}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {items.map((item) => (
          <StickerCell key={item.key} item={item} onPick={onPick} />
        ))}
      </View>
    </View>
  );
}
