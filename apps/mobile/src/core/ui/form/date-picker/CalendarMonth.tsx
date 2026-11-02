import { useState } from 'react';
import { View } from 'react-native';
import { CalendarDay } from './CalendarDay';
import {
  canShift,
  dayAllowed,
  type DayRange,
  monthGrid,
  openingMonth,
  shiftMonth,
} from './calendar-grid';
import { MonthHeader } from './MonthHeader';
import { WeekdayRow } from './WeekdayRow';

interface CalendarMonthProps {
  /** The picked day, YYYY-MM-DD. */
  value: string;
  range: DayRange & { today: string };
  onPick: (day: string) => void;
}

/**
 * A month of days, السبت first (rows follow the layout direction: السبت at the inline start,
 * the right in RTL). It opens on the picked day's month; the arrows stop at the range's first and
 * last months.
 */
export function CalendarMonth({ value, range, onPick }: CalendarMonthProps) {
  const [month, setMonth] = useState(() => openingMonth(value, range));
  const can = { prev: canShift(month, -1, range), next: canShift(month, 1, range) };
  return (
    <View testID="calendar-month" style={{ gap: 4 }}>
      <MonthHeader month={month} can={can} onStep={(delta) => setMonth(shiftMonth(month, delta))} />
      <WeekdayRow />
      {monthGrid(month).map((week) => (
        <View key={week.find(Boolean) ?? month} style={{ flexDirection: 'row' }}>
          {week.map((day, column) =>
            day === null ? (
              <View key={`blank-${String(column)}`} style={{ flex: 1 }} />
            ) : (
              <CalendarDay
                key={day}
                day={day}
                column={column}
                state={{
                  selected: day === value,
                  allowed: dayAllowed(day, range),
                  today: day === range.today,
                }}
                onPick={onPick}
              />
            ),
          )}
        </View>
      ))}
    </View>
  );
}
