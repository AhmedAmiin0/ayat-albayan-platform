import { slot, SUN_17 } from '@/booking/testing/fixtures';
import { t } from '@/core/lib/i18n/i18n';
import { besideTimes, rowCheck } from './row-check';

const viewer = { tz: 'Asia/Riyadh', cycle: '24' } as const;
const slots = {
  teacher_tz: 'Europe/London',
  step_min: 30,
  slots: [slot('2026-10-04T13:30:00.000Z'), slot(SUN_17, true), slot('2026-10-04T14:30:00.000Z')],
};
const ctx = {
  tz: 'Asia/Riyadh',
  slots,
  until: '2026-10-11T00:00:00.000Z',
  durationMin: 45,
  now: new Date('2026-10-02T09:00:00Z'),
  viewer,
};

test('an empty row has nothing to say yet', () => {
  expect(rowCheck({ date: '2026-10-04', time: '' }, ctx)).toEqual({ at: null, state: null, nearest: [], beside: [] });
});

test('a busy time (Riyadh wall clock) carries the grid’s conflict and the nearest free times', () => {
  const check = rowCheck({ date: '2026-10-04', time: '17:00' }, ctx);
  expect(check.at).toBe(SUN_17);
  expect(check.state?.kind).toBe('busy');
  expect(check.nearest).toEqual(['2026-10-04T13:30:00.000Z', '2026-10-04T14:30:00.000Z']);
});

test('a free time suggests nothing; slots still loading say nothing', () => {
  expect(rowCheck({ date: '2026-10-04', time: '16:30' }, ctx)).toMatchObject({ state: { kind: 'free' }, nearest: [] });
  expect(rowCheck({ date: '2026-10-04', time: '16:30' }, { ...ctx, slots: undefined }).state).toBeNull();
});

test('beside the student’s time: the teacher’s own clock (London), and the viewer’s when it differs', () => {
  expect(besideTimes(SUN_17, ctx)).toEqual([t.lessonTimes.teacherTime.replace('{time}', '15:00')]);
  const londonViewer = { ...ctx, viewer: { tz: 'Europe/London', cycle: '24' as const } };
  expect(besideTimes(SUN_17, londonViewer)).toEqual([
    t.lessonTimes.viewerTime.replace('{time}', '15:00'),
    t.lessonTimes.teacherTime.replace('{time}', '15:00'),
  ]);
  expect(besideTimes(SUN_17, { ...ctx, slots: { ...slots, teacher_tz: 'Asia/Riyadh' } })).toEqual([]);
});
