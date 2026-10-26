import type { ReactNode } from 'react';
import { View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * One block of the lesson sheet (owner: «no long pages: compact, grouped»): a small ink-3 header
 * read as a heading, then its lines on the raised card with a hairline edge, as the student file's
 * blocks.
 */
export function DetailsGroup({ label, children }: { label: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View
      style={{
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs, true),
          color: color.ink3,
        }}
      >
        {label}
      </AppText>
      {children}
    </View>
  );
}

/** A quiet second line inside a group: «عند الطالب 16:00 بتوقيت مسقط», «45 دقيقة». */
export function DetailsLine({
  children,
  tone = 'ink2',
}: {
  children: string;
  tone?: 'ink' | 'ink2' | 'bad';
}) {
  const { color } = useTheme();
  const strong = tone === 'ink';
  return (
    <AppText
      style={{
        fontFamily: type.ui[strong ? 600 : 400],
        fontSize: strong ? type.size.body : type.size.xs,
        lineHeight: type.lineHeight(strong ? type.size.body : type.size.xs),
        color: color[tone],
        fontVariant: ['tabular-nums'],
      }}
    >
      {children}
    </AppText>
  );
}

/** «المعلم/ة  أبرار»: a label beside its value, for the short facts of «بيانات الحلقة». */
export function DetailsFact({ label, children }: { label: string; children: ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
      <AppText
        style={{
          minWidth: 76,
          fontFamily: type.ui[500],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink3,
        }}
      >
        {label}
      </AppText>
      <View style={{ flex: 1 }}>
        {typeof children === 'string' ? <DetailsLine tone="ink">{children}</DetailsLine> : children}
      </View>
    </View>
  );
}
