import type { ReactNode } from 'react';
import { View } from 'react-native';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import type { AgendaItem } from './overview';
import { freeLabel } from './overview-text';
import type { OverviewLesson } from './overview-types';
import { dayLabel } from './week';

export interface AgendaItemRowProps {
  item: AgendaItem;
  /** One lesson's agenda row, with its actions. */
  lessonRow: (lesson: OverviewLesson) => ReactNode;
}

/** A «الجدول» section row: a lesson, a dashed «فاضي 17:00 – 19:00» gap, or (week) a day label. */
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
    <View
      style={{
        marginVertical: 4,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: color.ruleStrong,
      }}
    >
      <AppText style={{ ...small, fontFamily: type.ui[500], color: color.ink3 }}>
        {freeLabel(item.span)}
      </AppText>
    </View>
  );
}
