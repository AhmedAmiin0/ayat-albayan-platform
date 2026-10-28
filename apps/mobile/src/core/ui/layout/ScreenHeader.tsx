import type { ReactNode, Ref } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { HeaderConnectingBar } from '../connecting/HeaderConnectingBar';
import { Mark } from '../primitives/Mark';
import { AppText, type AppTextNode } from '../primitives/AppText';

/**
 * The title's size (owner 2026-10-27: «Header is oversized in all sections»): a screen's title at h3
 * (23pt), a sheet's at h4 (20pt), so the content starts higher, as WhatsApp's tabs.
 */
const TITLE = { h1: type.size.h3, h2: type.size.h4 } as const;

interface ScreenHeaderProps {
  /** Amiri title, e.g. t.mobile.today. Mobile has no cartouche: this is the screen's one title. */
  title: string;
  /** One line under it (date line, «عرض 25 من 107»…), 13pt ink-2, tabular digits. */
  subtitle?: string;
  /**
   * A list's total ON the title's line, «كل الطلاب · 233» (owner 2026-10-28: no separate count line):
   * only a number the API returned; undefined while it loads.
   */
  count?: number;
  /** At the inline-end; defaults to the small gold mark. */
  trailing?: ReactNode;
  /** h1 for a screen (the reconnecting bar shows under it); a sheet or dialog takes h2 so the title fits beside «إغلاق» (docs/07 §6). */
  size?: 'h1' | 'h2';
  /** The title's node, e.g. to move screen-reader focus to it when a sheet changes mode. */
  titleRef?: Ref<AppTextNode>;
  /** The reconnecting bar under the title; on for h1. A screen with a compact h2 title passes true. */
  connecting?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  count,
  trailing = <Mark size={28} />,
  size = 'h1',
  titleRef,
  connecting = size === 'h1',
}: ScreenHeaderProps) {
  const { color } = useTheme();
  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <AppText
          ref={titleRef}
          accessibilityRole="header"
          // One line always (owner 2026-10-27: «Conversations» wrapped in English): it shrinks to fit.
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            flexShrink: 1,
            fontFamily: type.display,
            fontSize: TITLE[size],
            lineHeight: type.lineHeight(TITLE[size], true),
            color: color.ink,
          }}
        >
          {title}
          {count === undefined ? null : (
            <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink3, fontVariant: ['tabular-nums'] }}>
              {` · ${count}`}
            </AppText>
          )}
        </AppText>
        {trailing}
      </View>
      {subtitle ? (
        <AppText
          style={{
            fontFamily: type.ui[500],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs, true),
            color: color.ink2,
            fontVariant: ['tabular-nums'],
          }}
        >
          {subtitle}
        </AppText>
      ) : null}
      {connecting ? <HeaderConnectingBar /> : null}
    </View>
  );
}
