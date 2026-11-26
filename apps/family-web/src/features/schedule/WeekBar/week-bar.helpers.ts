import { t } from '@ab/web-kit';

export const S = t.portal.app.schedule;

export const WEEK_WORD: readonly (() => string)[] = [
  () => S.thisWeek,
  () => S.nextWeek,
  () => S.laterWeek,
];

export const STEP = 'min-w-11 px-0 sm:min-h-11';
