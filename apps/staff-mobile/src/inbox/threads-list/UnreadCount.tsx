import { counted } from '@ab/core';
import { View } from 'react-native';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';

/** The drawn count: the number, «99+» above 99. */
export const unreadText = (n: number): string => (n > 99 ? '99+' : String(n));

/**
 * A chat's unread count as WhatsApp draws it (owner 2026-10-28): a small green circle with the number at the
 * row's end, so the name keeps its width (the «١ رسالة جديدة» chip squeezed it to one letter). The reader
 * hears the words («رسالة جديدة واحدة»). Its text does not scale: the 22pt circle would clip it.
 */
export function UnreadCount({ n }: { n: number }) {
  const { color } = useTheme();
  return (
    <View
      testID="unread-count"
      style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: color.lapisFill }}
    >
      <AppText
        accessibilityLabel={counted(t.inbox.unread, n)}
        allowFontScaling={false}
        style={{ fontFamily: type.ui[700], fontSize: 12, lineHeight: 16, color: color.onLapis, fontVariant: ['tabular-nums'] }}
      >
        {unreadText(n)}
      </AppText>
    </View>
  );
}
