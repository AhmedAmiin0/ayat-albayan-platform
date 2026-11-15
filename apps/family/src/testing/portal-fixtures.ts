import type { PortalLesson, PortalStudent } from '@ab/shared';

// Sample family data for the app's tests (names made up).

export const student = (over: Partial<PortalStudent> = {}): PortalStudent => ({
  id: '11111111-1111-4111-8111-111111111111',
  code: 'AB-0001',
  name: 'سارة',
  tz: 'Asia/Riyadh',
  contact_is_self: false,
  ...over,
});

const MIN = 60_000;

/** A lesson starting `inMin` minutes from `now`, 45 minutes long, window 10 minutes before. */
export function lesson(now: Date, inMin: number, over: Partial<PortalLesson> = {}): PortalLesson {
  const start = now.getTime() + inMin * MIN;
  const iso = (ms: number) => new Date(ms).toISOString();
  return {
    id: '22222222-2222-4222-8222-222222222222',
    starts_at: iso(start),
    ends_at: iso(start + 45 * MIN),
    status: 'confirmed',
    teacher: { display_name_ar: 'فاطمة', display_name_en: null },
    way_in: 'classroom',
    meeting_url: null,
    window: { state: 'early', opens_at: iso(start - 10 * MIN), closes_at: iso(start + 75 * MIN) },
    ...over,
  };
}
