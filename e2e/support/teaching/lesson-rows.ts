import type { Locator } from '@playwright/test';
import { ar } from '../core/fixtures';
import { addDays, nextWeekSaturday } from '../core/schedule';

// A package's lesson days in the booking wizard (owner 2026-11-07): per day a native date input and
// a native time input, the family's wall clock. Replaces clicking «الأسبوع التالي» + a slot.

/** Next week's (Riyadh, السبت → الجمعة) date of `weekday` (0 = الأحد): always in the future. */
export function nextWeekDay(weekday: number): string {
  return addDays(nextWeekSaturday(), (weekday + 1) % 7);
}

const rowName = (n: number): string => ar.lessonTimes.row.replace('{n}', String(n));

export interface RowAt {
  /** 0 = الأحد. */
  weekday: number;
  /** «HH:MM», the family's wall clock. */
  time: string;
  /** Weeks after next week (0 by default). */
  weeksLater?: number;
}

/**
 * Fills lesson row `n` (1-based) of the slot step with next week's `weekday` at `time`; a missing
 * row is added first («أضف يومًا», the admin's package).
 */
export async function fillLessonRow(step: Locator, n: number, at: RowAt): Promise<void> {
  const row = step.getByRole('group', { name: rowName(n) });
  const add = step.getByRole('button', { name: ar.lessonTimes.addDay });
  if ((await row.count()) === 0) await add.click();
  const date = addDays(nextWeekDay(at.weekday), 7 * (at.weeksLater ?? 0));
  await row.getByLabel(ar.lessonTimes.date, { exact: true }).fill(date);
  await row.getByLabel(ar.lessonTimes.time, { exact: true }).fill(at.time);
}
