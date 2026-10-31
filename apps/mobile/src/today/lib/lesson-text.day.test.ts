import { t } from '@/core/lib/i18n/i18n';
import { viewerDayHint } from './lesson-text';

// GET /lessons/day and /sales/schedule page by Riyadh days (docs/34 b). Sunday 1 Nov 2026 00:30 in
// Riyadh is Saturday 31 Oct 23:30 for a Cairo viewer (UTC+2 since 30 Oct).
const LATE = '2026-10-31T21:30:00.000Z';

test('a lesson on another day for the viewer names the viewer’s weekday', () => {
  expect(viewerDayHint(LATE, 'Africa/Cairo')).toBe(t.enums.weekday['6']);
});

test('same day for the viewer, or a Riyadh viewer: no hint', () => {
  expect(viewerDayHint(LATE, 'Asia/Riyadh')).toBeNull();
  expect(viewerDayHint('2026-10-31T15:00:00.000Z', 'Africa/Cairo')).toBeNull();
  // Dubai is ahead of Riyadh: 23:30 Riyadh Saturday is already Sunday there.
  expect(viewerDayHint('2026-10-31T20:30:00.000Z', 'Asia/Dubai')).toBe(t.enums.weekday['0']);
});
