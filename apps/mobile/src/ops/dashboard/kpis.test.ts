import { t } from '@/core/lib/i18n/i18n';
import { summary } from '../shared/fixtures';
import { kpisOf } from './kpis';

test('the web strip: needs-confirmation, reports, unpaid, tasks, then the active students', () => {
  expect(kpisOf(summary).map((k) => [k.key, k.value, k.act])).toEqual([
    ['needsConfirm', 3, true],
    ['reports', 2, true],
    ['unpaid', 0, false],
    ['tasks', 1, true],
    ['activeStudents', 41, false],
  ]);
});

test('labels are the web wording; only the three work tiles open a list', () => {
  const kpis = kpisOf(summary);
  expect(kpis.map((k) => k.label)).toEqual([
    t.enums.lessonStatus.scheduled,
    t.dashboard.pendingReports,
    t.dashboard.unpaidSubscriptions,
    t.dashboard.tasks,
    t.mobileAdmin.dashboard.activeStudents,
  ]);
  expect(kpis.map((k) => k.tab)).toEqual([undefined, 'reports', 'unpaid', 'tasks', undefined]);
});
