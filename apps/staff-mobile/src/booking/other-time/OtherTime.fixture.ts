// Test-only: GET /booking/outside-slots answers. Tue 1 Dec 2026: Cairo UTC+2, Riyadh UTC+3.

export const TEACHER_ID = '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11';
/** 12:00 Riyadh, 11:00 Cairo: outside the teacher hours. */
export const NOON = '2026-12-01T09:00:00.000Z';
/** 17:00 Riyadh, 16:00 Cairo: inside. */
export const FIVE_PM = '2026-12-01T14:00:00.000Z';
/** 00:30 Wed in Riyadh, 23:30 Tue in Cairo: the viewer's zone decides its day. */
export const LATE = '2026-12-01T21:30:00.000Z';

const slot = (startsAt: string, inside: boolean) => ({
  starts_at: startsAt,
  ends_at: new Date(Date.parse(startsAt) + 45 * 60_000).toISOString(),
  inside_hours: inside,
});

export const OUTSIDE_LIST = {
  server_now: '2026-12-01T08:00:00.000Z',
  teacher_tz: 'Africa/Cairo',
  step_min: 30,
  slots: [slot(NOON, false), slot(FIVE_PM, true), slot(LATE, false)],
};
