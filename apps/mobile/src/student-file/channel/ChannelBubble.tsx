import { channelTimeText } from '@ab/client-core';
import { splitLinks, type ChannelMessageView } from '@ab/shared';
import { Linking, Pressable, View, type ViewStyle } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle } from '@/core/lib/clock';
import { locale } from '@/core/lib/i18n/locale';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ContentText } from '@/core/ui/primitives/ContentText';

const small = {
  fontFamily: type.ui[500],
  fontSize: type.size.xs,
  lineHeight: type.lineHeight(type.size.xs, true),
} as const;

/** Mine at the inline end with its tail there (WhatsApp), theirs at the start. */
const boxStyle = (mine: boolean, color: ReturnType<typeof useTheme>['color']): ViewStyle => ({
  alignSelf: mine ? 'flex-end' : 'flex-start',
  maxWidth: '85%',
  gap: 4,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: shape.radius.lg,
  ...(mine ? { borderTopEndRadius: shape.radius.xs } : { borderTopStartRadius: shape.radius.xs }),
  borderWidth: 1,
  borderColor: color.rule,
  backgroundColor: mine ? color.lapisWash : color.raised,
});

interface ChannelBubbleProps {
  message: ChannelMessageView;
  tz: string;
  /** «تعديل» / «حذف للجميع» apply (channelBubbleActions): a long press opens the menu. */
  onLongPress?: () => void;
}

/**
 * One message: who (the caller is «أنت»), the text with its links clickable (splitLinks), the time.
 * Mine sits at the inline end like WhatsApp (left in Arabic, right in English); the text aligns by its own words.
 */
export function ChannelBubble({ message: m, tz, onLongPress }: ChannelBubbleProps) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const time = channelTimeText({ iso: m.created_at, tz, now: new Date(), locale, cycle });
  // «تم التعديل» by the time (owner 2026-10-30); a deleted message is only its muted line.
  const meta = m.edited ? `${t.studentChannel.actions.edited} · ${time}` : time;
  const who = m.mine
    ? t.studentChannel.you
    : [m.sender_name, t.studentChannel.roles[m.sender_role]].filter(Boolean).join(' · ');
  const Box = onLongPress ? Pressable : View;
  return (
    <Box
      testID={`channel-bubble-${m.id}`}
      {...(onLongPress
        ? { onLongPress, delayLongPress: 350, accessibilityHint: t.studentChannel.actions.menu }
        : {})}
      style={boxStyle(m.mine, color)}
    >
      <AppText style={{ ...small, color: color.ink3 }}>{who}</AppText>
      {m.deleted ? (
        <AppText style={{ ...small, fontStyle: 'italic', color: color.ink3 }}>
          {t.studentChannel.actions.deleted}
        </AppText>
      ) : (
        <ContentText source={m.body}>
          {splitLinks(m.body).map((part, i) =>
            part.href ? (
              <AppText
                key={i}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(part.href ?? '').catch(() => undefined)}
                style={{ color: color.lapis, textDecorationLine: 'underline' }}
              >
                {part.text}
              </AppText>
            ) : (
              part.text
            ),
          )}
        </ContentText>
      )}
      <AppText style={{ ...small, color: color.ink3, textAlign: 'right' }}>{meta}</AppText>
    </Box>
  );
}
