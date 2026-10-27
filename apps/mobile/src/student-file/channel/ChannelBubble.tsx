import { channelTimeText } from '@ab/client-core';
import { splitLinks, type ChannelMessageView } from '@ab/shared';
import { Linking, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

const small = { fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs, true) } as const;

/** One message: who (the caller is «أنت»), the text with its links clickable (splitLinks), the time. */
export function ChannelBubble({ message: m, tz }: { message: ChannelMessageView; tz: string }) {
  const { color } = useTheme();
  const who = m.mine ? t.studentChannel.you : [m.sender_name, t.studentChannel.roles[m.sender_role]].filter(Boolean).join(' · ');
  return (
    <View
      style={{
        alignSelf: m.mine ? 'flex-start' : 'flex-end',
        maxWidth: '85%',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: m.mine ? color.lapisWash : color.raised,
      }}
    >
      <AppText style={{ ...small, color: color.ink3 }}>{who}</AppText>
      <AppText>
        {splitLinks(m.body).map((part, i) =>
          part.href ? (
            <AppText key={i} accessibilityRole="link" onPress={() => void Linking.openURL(part.href ?? '').catch(() => undefined)} style={{ color: color.lapis, textDecorationLine: 'underline', writingDirection: 'ltr' }}>
              {part.text}
            </AppText>
          ) : (
            part.text
          ),
        )}
      </AppText>
      <AppText style={{ ...small, color: color.ink3, textAlign: 'right' }}>{channelTimeText({ iso: m.created_at, tz, now: new Date(), locale })}</AppText>
    </View>
  );
}
