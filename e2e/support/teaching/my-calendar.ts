import { zonedPartsIn } from '@ab/time';
import type { Locator, Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';

// The home lists today only, so a later lesson's card opens from the week grid.

const DAY = 86_400_000;

/** The Saturday that starts `at`'s week on her (Cairo) calendar, as epoch ms. */
function saturdayOf(at: Date): number {
  const day = new Date(`${zonedPartsIn(at, 'Africa/Cairo').date}T00:00:00Z`);
  return day.getTime() - ((day.getUTCDay() + 1) % 7) * DAY;
}

/** Whole weeks from this week to `at`'s (0 = this week). */
const weeksAhead = (at: Date) => Math.round((saturdayOf(at) - saturdayOf(new Date())) / (7 * DAY));

interface MyLesson {
  /** Her student's name on the chip. */
  name: RegExp;
  at: Date;
  /** The week's last chip of that name (e.g. the moved lesson after its old, rescheduled one). */
  last?: boolean;
}

/** Opens her lesson on `at` (its student's name in `name`) and returns its drawer. */
export async function openMyLesson(page: Page, o: MyLesson): Promise<Locator> {
  await page.goto('/teacher/calendar');
  await expect(page.getByRole('group', { name: ar.booking.weekNav })).toBeVisible();
  for (let i = 0; i < weeksAhead(o.at); i += 1) {
    await page.getByRole('button', { name: ar.schedule.nextWeek }).click();
  }
  await page.getByRole('button', { name: o.name }).nth(o.last ? -1 : 0).click();
  return page.getByRole('dialog', { name: o.name });
}

export async function openMyAvailability(page: Page): Promise<void> {
  await page.goto('/teacher/availability');
  await expect(page).toHaveURL(/\/teacher\/availability/);
}
