import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';

interface HeroFrameProps {
  /** «جارية الآن» or «الحلقة التالية · بعد 12 دقيقة». */
  lead: string;
  /** At the end of the lead line: the status chip, or the teacher's word (none: nothing). */
  chip?: ReactNode;
  /** The start on the viewer's clock, large. */
  time: string;
  names: string;
  subtitle: string;
  /** The buttons and notes under the line. */
  children: ReactNode;
}

const timeStyle = { fontFamily: type.ui[700], fontSize: 34, lineHeight: 40 } as const;
const namesStyle = { fontFamily: type.ui[700], fontSize: type.size.lg, lineHeight: 28 } as const;
const leadRow = {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
} as const;
const subStyle = { fontFamily: type.ui[400], fontSize: type.size.xs, lineHeight: 20 } as const;

/**
 * The hero's frame on the lapis wash (docs/29 §3): the lead and its chip, the time large beside the
 * students and the subtitle, then the caller's buttons. HeroCard (admin, sales) and TeacherHero
 * (docs/48) draw the same card.
 */
export function HeroFrame({ lead, chip, time, names, subtitle, children }: HeroFrameProps) {
  const { color } = useTheme();
  const wash = { gap: 12, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 16 };
  return (
    <View style={{ ...wash, borderRadius: 24, backgroundColor: color.lapisWash }}>
      {/* The chip keeps its whole word (owner 2026-10-28): the lead wraps first. */}
      <View style={leadRow}>
        <AppText
          style={{ flexShrink: 1, ...subStyle, fontFamily: type.ui[600], color: color.lapis }}
        >
          {lead}
        </AppText>
        {chip ? <View style={{ flexShrink: 0, maxWidth: '60%' }}>{chip}</View> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <AppText style={{ ...timeStyle, color: color.coverInk, fontVariant: ['tabular-nums'] }}>
          {time}
        </AppText>
        <View style={{ flex: 1 }}>
          <AppText numberOfLines={2} style={{ ...namesStyle, color: color.ink }}>
            {names}
          </AppText>
          <AppText style={{ ...subStyle, color: color.ink2, fontVariant: ['tabular-nums'] }}>
            {subtitle}
          </AppText>
        </View>
      </View>
      {children}
    </View>
  );
}
