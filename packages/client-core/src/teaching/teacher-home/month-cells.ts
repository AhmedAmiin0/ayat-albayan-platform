import { type MonthCell, monthGrid } from './month-grid.js';

// The month grid's cells as both apps draw them: the day, whether it is today or picked, and how
// many of her lessons it holds.

export interface MonthDayView extends MonthCell {
  today: boolean;
  picked: boolean;
  count: number;
}

export interface MonthCellsInput {
  today: string;
  picked: string | null;
  /** Her lessons by local day (lessonsByDay). */
  days: ReadonlyMap<string, readonly unknown[]>;
}

/** The grid's weeks (Saturday first) with each day's state. */
export function monthCells(month: string, o: MonthCellsInput): MonthDayView[][] {
  return monthGrid(month).map((week) =>
    week.map((cell) => ({
      ...cell,
      today: cell.date === o.today,
      picked: cell.date === o.picked,
      count: o.days.get(cell.date)?.length ?? 0,
    })),
  );
}
