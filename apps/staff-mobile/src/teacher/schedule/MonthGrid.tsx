import { monthCells, type MonthDayView } from '@ab/client-core';
import type { LessonView } from '@ab/shared';
import { Pressable, View } from 'react-native';
import { t, AppText, shape, type, useTheme } from '@ab/mobile-kit';
import { dayCellLabel, dayNumber, weekdayNarrow } from './month-text';

interface MonthGridProps {
  month: string;
  today: string;
  picked: string | null;
  days: ReadonlyMap<string, readonly LessonView[]>;
  onPick: (date: string) => void;
}

const row = { flexDirection: 'row', gap: 2 } as const;
const dot = { width: 6, height: 6, borderRadius: 3 } as const;
const headStyle = { flex: 1, textAlign: 'center', fontFamily: type.ui[600], fontSize: type.size.xs } as const;

/** Whole weeks Saturday to Friday, right to left, each day a 44pt cell. */
export function MonthGrid({ month, today, picked, days, onPick }: MonthGridProps) {
  const { color } = useTheme();
  const weeks = monthCells(month, { today, picked, days });
  return (
    <View accessibilityLabel={t.teacherSchedule.monthGrid} style={{ gap: 2 }}>
      <View style={row} importantForAccessibility="no-hide-descendants">
        {(weeks[0] ?? []).map((cell) => (
          <AppText key={cell.date} style={{ ...headStyle, color: color.ink3 }}>
            {weekdayNarrow(cell.date)}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]?.date} style={row}>
          {week.map((cell) => (
            <DayCell key={cell.date} cell={cell} onPick={onPick} />
          ))}
        </View>
      ))}
    </View>
  );
}

function DayCell({ cell, onPick }: { cell: MonthDayView; onPick: (date: string) => void }) {
  const { color } = useTheme();
  const isPicked = cell.picked;
  const ink = cell.inMonth ? color.ink : color.ink3;
  const weight = isPicked ? 700 : 400;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dayCellLabel(cell.date, cell.count)}
      accessibilityState={{ selected: isPicked }}
      onPress={() => onPick(cell.date)}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        borderRadius: shape.radius.md,
        borderWidth: cell.today ? 1 : 0,
        borderColor: color.gold,
        backgroundColor: isPicked || pressed ? color.lapisWash : 'transparent',
      })}
    >
      <AppText style={{ fontFamily: type.ui[weight], fontSize: type.size.sm, color: ink }}>
        {dayNumber(cell.date)}
      </AppText>
      <View style={{ ...dot, backgroundColor: cell.count > 0 ? color.gold : 'transparent' }} />
    </Pressable>
  );
}
