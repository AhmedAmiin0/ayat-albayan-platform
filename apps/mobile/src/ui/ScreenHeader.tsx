import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { Mark } from './Mark';
import { AppText } from './AppText';

export interface ScreenHeaderProps {
  /** Amiri title, e.g. t.mobile.today. Mobile has no cartouche: this is the screen's one title. */
  title: string;
  /** One line under it (date line, «عرض 25 من 107»…), 13pt ink-2, tabular digits. */
  subtitle?: string;
  /** At the inline-end; defaults to the small gold mark. */
  trailing?: ReactNode;
}

export function ScreenHeader({
  title,
  subtitle,
  trailing = <Mark size={28} />,
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
          accessibilityRole="header"
          style={{
            flexShrink: 1,
            fontFamily: type.display,
            fontSize: type.size.h1,
            lineHeight: type.lineHeight(type.size.h1, true),
            color: color.ink,
          }}
        >
          {title}
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
    </View>
  );
}
