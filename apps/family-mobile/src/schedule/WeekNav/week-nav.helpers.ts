import { t } from '@ab/mobile-kit';

/** The weeks the API covers (the next 14 days reach into the third week). */
export const LAST_WEEK = 2;

export const TITLE: readonly (() => string)[] = [
  () => t.portal.app.schedule.thisWeek,
  () => t.portal.app.schedule.nextWeek,
  () => t.portal.app.schedule.laterWeek,
];
