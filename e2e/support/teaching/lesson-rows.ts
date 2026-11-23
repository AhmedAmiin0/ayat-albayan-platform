import type { Locator } from '@playwright/test';
import { ar } from '../core/fixtures';
import { addDays, nextWeekSaturday } from '../core/schedule';

// Per lesson day, a native date and time input in the family's wall clock.

/** Next week's date (Riyadh, Saturday to Friday) of `weekday` (0 = Sunday), in the future. */
function nextWeekDay(weekday: number): string {
  return addDays(nextWeekSaturday(), (weekday + 1) % 7);
}

const rowName = (n: number): string => ar.lessonTimes.row.replace('{n}', String(n));

interface RowAt {
  /** 0 = Sunday. */
  weekday: number;
  /** «HH:MM», the family's wall clock. */
  time: string;
  /** Weeks after next week (0 by default). */
  weeksLater?: number;
}

/** `n` is 1-based; a missing row is added first (the admin's package). */
export async function fillLessonRow(step: Locator, n: number, at: RowAt): Promise<void> {
  const row = step.getByRole('group', { name: rowName(n) });
  const add = step.getByRole('button', { name: ar.lessonTimes.addDay });
  if ((await row.count()) === 0) await add.click();
  const date = addDays(nextWeekDay(at.weekday), 7 * (at.weeksLater ?? 0));
  await row.getByLabel(ar.lessonTimes.date, { exact: true }).fill(date);
  await row.getByLabel(ar.lessonTimes.time, { exact: true }).fill(at.time);
}
