import { lessonStatusStyle, type LessonStatus } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import { toneColors } from '@/ui/StatusChip';

export interface TimelineRowProps {
  /** Riyadh start, «16:00». */
  time: string;
  /** The node on the spine takes the lesson status's glyph and tone. */
  status: LessonStatus;
  /** Past rows sit tighter (docs/07 §12: one 42pt row). */
  compact?: boolean;
  children: ReactNode;
}

/**
 * One stop on the Today spine (docs/07 §12): content at the inline-start, then the 1.5pt
 * rule-strong spine with a 14pt nuqta node, then the time at the inline-end. Rows touch, so the
 * spine segments join into one line.
 */
export function TimelineRow({ time, status, compact = false, children }: TimelineRowProps) {
  const { color } = useTheme();
  const style = lessonStatusStyle[status];
  const nodeTop = compact ? 14 : 22;
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <View style={{ flex: 1, paddingVertical: compact ? 0 : 6 }}>{children}</View>
      <View style={{ width: 14, alignItems: 'center' }}>
        <View
          style={{ position: 'absolute', top: 0, bottom: 0, width: 1.5, backgroundColor: color.ruleStrong }}
        />
        <View style={{ marginTop: nodeTop, backgroundColor: color.margin }}>
          <NuqtaGlyph shape={style.glyph} color={toneColors(color, style.tone).fg} size={14} />
        </View>
      </View>
      <AppText
        style={{
          width: 44,
          marginTop: nodeTop - 4,
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: 22,
          color: compact ? color.ink3 : color.ink2,
          fontVariant: ['tabular-nums'],
        }}
      >
        {time}
      </AppText>
    </View>
  );
}
