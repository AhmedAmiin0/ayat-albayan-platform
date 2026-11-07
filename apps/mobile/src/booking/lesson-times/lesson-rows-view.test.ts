import { counted } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { rowsView } from './lesson-rows-view';

const TZ = 'Asia/Riyadh';
const NOW = new Date('2026-10-02T06:00:00Z');
const free = { fixed: false, tz: TZ, now: NOW };
const sun = { date: '2026-10-04', time: '17:00' };
const thu = { date: '2026-10-08', time: '18:00' };
const empty = { date: '', time: '' };

test('a course (fixed): ready only with every row filled on distinct weekdays; never add or remove', () => {
  const half = rowsView([sun, empty], { fixed: true, tz: TZ, now: NOW });
  expect(half).toMatchObject({ ready: false, canAdd: false, removable: false });
  expect(half.heading).toBe(counted(t.booking.pickNDays, 2));
  expect(half.progress).not.toBeNull();
  expect(rowsView([sun, thu], { fixed: true, tz: TZ, now: NOW })).toMatchObject({ ready: true, picks: ['2026-10-04T14:00:00.000Z', '2026-10-08T15:00:00.000Z'] });
  expect(rowsView([sun, { ...sun, date: '2026-10-11' }], { fixed: true, tz: TZ, now: NOW })).toMatchObject({ ready: false, repeated: [1] });
});

test('a package (free count): add up to seven days, remove while more than one', () => {
  const one = rowsView([sun], free);
  expect(one).toMatchObject({ ready: true, canAdd: true, removable: false, progress: null });
  expect(one.heading).toBe(t.booking.pickDayTimes);
  expect(rowsView([sun, empty], free)).toMatchObject({ ready: false, removable: true });
  expect(rowsView(Array.from({ length: 7 }, () => empty), free).canAdd).toBe(false);
});

test('a past time keeps «التالي» shut', () => {
  const later = new Date('2026-10-04T15:00:00Z'); // Sunday 18:00 Riyadh: 17:00 has passed
  expect(rowsView([sun, thu], { fixed: true, tz: TZ, now: later }).ready).toBe(false);
});
