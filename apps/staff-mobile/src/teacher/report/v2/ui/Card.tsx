import type { ReactNode } from 'react';
import { View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';

interface CardProps {
  title?: string;
  aside?: string | null;
  optional?: boolean;
  tone?: 'raised' | 'wash';
  children: ReactNode;
}

/** One block of the v2 form (docs/design/report-form): a raised rounded card, its title, its content. */
export function Card({ title, aside, optional, tone = 'raised', children }: CardProps) {
  const { color } = useTheme();
  const wash = tone === 'wash';
  return (
    <View
      style={{
        gap: 10,
        padding: 14,
        borderRadius: shape.radius.lg,
        borderWidth: wash ? 0 : 1,
        borderColor: color.rule,
        backgroundColor: wash ? color.lapisWash : color.raised,
      }}
    >
      {title ? (
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <AppText
            accessibilityRole="header"
            style={{
              fontFamily: type.ui[700],
              fontSize: type.size.base,
              lineHeight: type.lineHeight(type.size.base),
              color: color.ink,
            }}
          >
            {title}
            {optional ? (
              <AppText
                style={{ fontFamily: type.ui[500], fontSize: type.size.xs, color: color.ink3 }}
              >{` ${t.reports.v2.optional}`}</AppText>
            ) : null}
          </AppText>
          {aside ? (
            <AppText
              style={{ fontFamily: type.ui[400], fontSize: type.size['2xs'], color: color.ink3 }}
            >
              {aside}
            </AppText>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}
