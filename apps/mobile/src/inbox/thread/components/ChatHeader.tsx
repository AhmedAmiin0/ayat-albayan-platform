import type { ReactNode } from 'react';
import { I18nManager, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { physicalRow } from '../../shared/physical-row';

interface ChatHeaderProps {
  /** The name (or the number); one line, cut with an ellipsis. */
  title: string;
  /** «عميل محتمل · +966 …» or when the saved thread was fetched; one smaller line. */
  subtitle?: string;
  onBack: () => void;
  /** Icon buttons on the physical right («تحقق من التسجيل»). */
  trailing?: ReactNode;
}

/**
 * A chat's header in one ~52pt line, WhatsApp-like, so the messages get the room (owner
 * 2026-10-18): «رجوع» as a chevron, the name in Amiri at h4 and the subtitle under it, both one
 * line, then the icon actions. As WhatsApp in Arabic and English alike (owner 2026-10-27): the
 * chevron on the physical left pointing left, the name beside it, the icons on the right.
 */
export function ChatHeader({ title, subtitle, onBack, trailing }: ChatHeaderProps) {
  const { color } = useTheme();
  const row = physicalRow(I18nManager.isRTL);
  return (
    <View
      testID="chat-header"
      style={{
        flexDirection: row.direction,
        alignItems: 'center',
        gap: 4,
        minHeight: 52,
        // The chevron's 44pt box reaches the screen's left edge.
        marginStart: row.leftEdge === 'start' ? -10 : 0,
        marginEnd: row.leftEdge === 'end' ? -10 : 0,
      }}
    >
      <IconButton label={t.common.back} onPress={onBack}>
        <Chevron to={row.leftEdge === 'start' ? 'prev' : 'next'} color={color.ink} size={22} />
      </IconButton>
      {/* Shrunk to its text on the physical left: an Arabic name keeps its own direction inside. */}
      <View testID="chat-names" style={{ flex: 1, minWidth: 0, alignItems: row.left }}>
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
