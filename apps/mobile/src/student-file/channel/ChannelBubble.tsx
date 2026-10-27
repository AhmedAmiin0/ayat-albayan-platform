import { channelTimeText } from '@ab/client-core';
import { splitLinks, type ChannelMessageView } from '@ab/shared';
import { Linking, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle } from '@/core/lib/clock';
import { locale } from '@/core/lib/i18n/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';

const small = { fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs, true) } as const;

/**
 * One message: who (the caller is «أنت»), the text with its links clickable (splitLinks), the time.
 * Mine sits at the inline end like WhatsApp (left in Arabic, right in English); the text aligns by its own words.
 */
export function ChannelBubble({ message: m, tz }: { message: ChannelMessageView; tz: string }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const who = m.mine ? t.studentChannel.you : [m.sender_name, t.studentChannel.roles[m.sender_role]].filter(Boolean).join(' · ');
  return (
    <View
      testID={`channel-bubble-${m.id}`}
      style={{
        alignSelf: m.mine ? 'flex-end' : 'flex-start',
        maxWidth: '85%',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: shape.radius.lg,
        ...(m.mine ? { borderTopEndRadius: shape.radius.xs } : { borderTopStartRadius: shape.radius.xs }),
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: m.mine ? color.lapisWash : color.raised,
      }}
    >
      <AppText style={{ ...small, color: color.ink3 }}>{who}</AppText>
      <ContentText source={m.body}>
        {splitLinks(m.body).map((part, i) =>
          part.href ? (
            <AppText key={i} accessibilityRole="link" onPress={() => void Linking.openURL(part.href ?? '').catch(() => undefined)} style={{ color: color.lapis, textDecorationLine: 'underline' }}>
              {part.text}
            </AppText>
          ) : (
            part.text
          ),
        )}
      </ContentText>
      <AppText style={{ ...small, color: color.ink3, textAlign: 'right' }}>{channelTimeText({ iso: m.created_at, tz, now: new Date(), locale, cycle })}</AppText>
    </View>
  );
}
