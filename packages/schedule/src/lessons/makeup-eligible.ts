import type { MakeupOriginal, MakeupVerdict } from './makeup-eligible.types';

const DAY_MS = 86_400_000;

/** settings.makeup_window_days default, pinned by shared join-window.registry.test.ts. */
export const MAKEUP_WINDOW_DAYS = 60;

type MakeupCheck = readonly [MakeupVerdict, (o: MakeupOriginal) => boolean];

/** Checked in order: the first that fails is the verdict. */
const MAKEUP_CHECKS: readonly MakeupCheck[] = [
  ['is_makeup', (o) => o.makeup],
  ['trial', (o) => o.trial],
  ['status', (o) => o.status !== 'no_show' && o.status !== 'excused'],
  ['not_charged', (o) => !o.chargeable],
];

/** Only a charged own miss within `windowDays`; teacher or admin cancels are rescheduled. */
export function makeupEligible(
  original: MakeupOriginal,
  now: Date,
  windowDays: number = MAKEUP_WINDOW_DAYS,
): MakeupVerdict {
  const failed = MAKEUP_CHECKS.find(([, fails]) => fails(original));
  if (failed) return failed[0];
  return Date.parse(original.startsAt) >= now.getTime() - windowDays * DAY_MS ? 'ok' : 'too_old';
}
