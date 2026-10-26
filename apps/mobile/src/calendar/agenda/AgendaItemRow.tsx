import type { LessonView } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import type { AgendaItem } from '../overview/overview';
import { freeLabel } from '../overview/overview-text';
import { dayLabel } from '../lib/week';

export interface AgendaItemRowProps {
  item: AgendaItem;
  /** One lesson's agenda row, with its actions. */
  lessonRow: (lesson: LessonView) => ReactNode;
}

/**
 * A «الجدول» section row: a lesson, a quiet «فاضي 17:00 – 19:00» line (a hollow nuqta, not a box that
 * looks tappable: booking from a gap is a web flow until the app has a lead picker), or (week) a
 * day label.
 */
export function AgendaItemRow({ item, lessonRow }: AgendaItemRowProps) {
  const { color } = useTheme();
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
      <AppText style={{ ...small, fontFamily: type.ui[500], color: color.ink3 }}>{freeLabel(item.span)}</AppText>
    </View>
  );
}
