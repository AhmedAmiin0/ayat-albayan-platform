import type { PendingReportView } from '@ab/shared';
import { jana, lesson, yusuf } from '@/today/testing/fixtures';
import { dueReports } from './due-reports';

const now = new Date('2026-10-01T14:00:00Z');
/** Started at 16:00 Riyadh today, after the pending list was read: not on it. */
const fresh = lesson({ id: 'fresh', starts_at: '2026-10-01T13:00:00.000Z' });
const ahead = lesson({ id: 'ahead', starts_at: '2026-10-01T16:00:00.000Z' });
const sent = lesson({
  id: 'sent',
  starts_at: '2026-10-01T10:00:00.000Z',
  students: [
    { ...yusuf, report: { id: 'r', status: 'submitted', sent_at: '2026-10-01T11:00:00Z' } },
  ],
});

const row = (lessonId: string, over: Partial<PendingReportView> = {}): PendingReportView => ({
  lesson_id: lessonId,
  starts_at: '2026-09-29T13:00:00.000Z',
  status: 'scheduled',
  student: { id: 's1', code: 'AB-0182', name: 'يوسف أحمد' },
  report_id: null,
  ...over,
});

test('a lesson that started after the pending read still shows; ahead and sent ones do not', () => {
  const rows = dueReports({ today: [fresh, ahead, sent], pending: [], heroId: undefined, now });
  expect(rows).toEqual([
    { lessonId: 'fresh', startsAt: fresh.starts_at, names: ['يوسف أحمد'], stage: 'write' },
  ]);
});

test('the hero’s lesson is skipped, from today and from the pending list', () => {
  const pending = [row('fresh'), row('old')];
  const rows = dueReports({ today: [fresh], pending, heroId: 'fresh', now });
  expect(rows.map((r) => r.lessonId)).toEqual(['old']);
  expect(dueReports({ today: [], pending: [row('old')], heroId: 'old', now })).toEqual([]);
});

test('two pending students of one lesson: one row, «أكمل» once any has a draft', () => {
  const second = { student: { id: 's2', code: 'AB-0185', name: jana.name } };
  const pending = [row('g'), row('g', second)];
  expect(dueReports({ today: [], pending, heroId: undefined, now })).toEqual([
    {
      lessonId: 'g',
      startsAt: row('g').starts_at,
      names: ['يوسف أحمد', jana.name],
      stage: 'write',
    },
  ]);
  const drafted = [row('g', { report_id: 'r1' }), row('g')];
  expect(dueReports({ today: [], pending: drafted, heroId: undefined, now })[0]?.stage).toBe(
    'resume',
  );
});

test('today’s rows first, then older pending lessons oldest first; today’s ids not twice', () => {
  const pending = [
    row('newer', { starts_at: '2026-09-30T08:00:00.000Z' }),
    row('older', { starts_at: '2026-09-28T08:00:00.000Z' }),
    row('fresh'),
  ];
  const rows = dueReports({ today: [fresh], pending, heroId: undefined, now });
  expect(rows.map((r) => r.lessonId)).toEqual(['fresh', 'older', 'newer']);
});

test('a draft on today’s lesson reads «أكمل»; the pending list not loaded: today only', () => {
  const draft = lesson({
    id: 'd',
    starts_at: '2026-10-01T12:00:00.000Z',
    students: [{ ...yusuf, report: { id: 'r', status: 'draft', sent_at: null } }],
  });
  const rows = dueReports({ today: [draft], pending: undefined, heroId: undefined, now });
  expect(rows.map((r) => [r.lessonId, r.stage])).toEqual([['d', 'resume']]);
});
