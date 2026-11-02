import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { PresenceLabel } from '@/core/ui/feedback/PresenceLabel';

interface ChatHeaderProps {
  /** The name (or the number); one line, cut with an ellipsis. */
  title: string;
  /** «عميل محتمل · +966 …» or when the saved thread was fetched; one smaller line. */
  subtitle?: string;
  /** «آخر رسالة منذ …» (docs/33 §4): a third, smaller line; '' or unset = none. */
  status?: string;
  onBack: () => void;
  /** The contact's initials circle, beside the chevron (decorative: the title reads the name). */
  avatar?: ReactNode;
  /** Icon buttons at the inline-end («تحقق من التسجيل»). */
  trailing?: ReactNode;
  /** Tapping the name or number: the student's details (owner 2026-10-29). Unset = not tappable. */
  onTitlePress?: () => void;
}

/**
 * A chat's header in one ~52pt line, WhatsApp-like, so the messages get the room (owner
 * 2026-10-18): «رجوع» as a chevron, the name in Amiri at h4 and the subtitle under it, both one
 * line, then the icon actions. As WhatsApp (owner 2026-10-27), a logical row that RN mirrors: the
 * back chevron at the inline-start pointing back (the right in Arabic, the left in English), the
 * contact's initials and the name beside it, the icons at the end.
 */
export function ChatHeader(props: ChatHeaderProps) {
  const { title, subtitle, status, onBack, avatar, trailing, onTitlePress } = props;
  const { color } = useTheme();
  return (
    <View
      testID="chat-header"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        minHeight: 52,
        // The chevron's 44pt box reaches the screen's start edge.
        marginStart: -10,
      }}
    >
      <IconButton label={t.common.back} onPress={onBack}>
        <Chevron to="prev" color={color.ink} size={22} />
      </IconButton>
      {avatar}
      {/* Hugs the chevron at the inline-start. */}
      <Pressable
        testID="chat-names"
        disabled={!onTitlePress}
        onPress={onTitlePress}
        accessibilityRole={onTitlePress ? 'button' : undefined}
        accessibilityHint={onTitlePress ? t.inbox.studentDetails : undefined}
        style={{ flex: 1, minWidth: 0, alignItems: 'flex-start' }}
      >
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
        <PresenceLabel testID="chat-status" text={status ?? ''} />
      </Pressable>
      {trailing}
    </View>
  );
}
