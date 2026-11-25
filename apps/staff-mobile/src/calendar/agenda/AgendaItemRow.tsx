import type { LessonView } from '@ab/schedule';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { type, useTheme, AppText, NuqtaGlyph } from '@ab/mobile-kit';
import type { AgendaItem } from '@/calendar/overview/overview';
import { freeLabel } from '@/calendar/overview/overview-text';
import { dayLabel } from '@/calendar/lib/week';

interface AgendaItemRowProps {
  item: AgendaItem;
  /** One lesson's agenda row, with its actions. */
  lessonRow: (lesson: LessonView) => ReactNode;
}

/** Gaps are a quiet line: booking from a gap is web-only until there is a lead picker. */
export function AgendaItemRow({ item, lessonRow }: AgendaItemRowProps) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const small = {
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    fontVariant: ['tabular-nums' as const],
  };
  if (item.kind === 'lesson') return <>{lessonRow(item.lesson)}</>;
  if (item.kind === 'day') {
    return (
      <AppText style={{ ...small, paddingTop: 8, fontFamily: type.ui[600], color: color.ink2 }}>
        {dayLabel(item.date)}
      </AppText>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
      <NuqtaGlyph shape="hollow" color={color.ink3} />
      <AppText style={{ ...small, fontFamily: type.ui[500], color: color.ink3 }}>
        {freeLabel(item.span, cycle, tz)}
      </AppText>
    </View>
  );
}
