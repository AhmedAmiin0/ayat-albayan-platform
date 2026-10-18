import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Chevron } from '@/ui/Chevron';
import { IconButton } from '@/ui/IconButton';

export interface ChatHeaderProps {
  /** The name (or the number); one line, cut with an ellipsis. */
  title: string;
  /** «عميل محتمل · +966 …» or when the saved thread was fetched; one smaller line. */
  subtitle?: string;
  onBack: () => void;
  /** Icon buttons at the inline-end («تحقق من التسجيل»). */
  trailing?: ReactNode;
}

/**
 * A chat's header in one ~52pt line, WhatsApp-like, so the messages get the room (owner
 * 2026-10-18): «رجوع» as a chevron at the inline-start (it points right in Arabic), the name in
 * Amiri at h4 and the subtitle under it, both one line, then the icon actions.
 */
export function ChatHeader({ title, subtitle, onBack, trailing }: ChatHeaderProps) {
  const { color } = useTheme();
  return (
    <View
      testID="chat-header"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minHeight: 52,
        marginStart: -10,
      }}
    >
      <IconButton label={t.common.back} onPress={onBack}>
        <Chevron to="prev" color={color.ink} size={22} />
      </IconButton>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          testID="chat-title"
          accessibilityRole="header"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontFamily: type.display,
            fontSize: type.size.h4,
            lineHeight: type.lineHeight(type.size.h4, true),
            color: color.ink,
          }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText
            testID="chat-subtitle"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              fontFamily: type.ui[500],
              fontSize: type.size['2xs'],
              lineHeight: type.lineHeight(type.size['2xs']),
              color: color.ink2,
              fontVariant: ['tabular-nums'],
            }}
          >
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}
