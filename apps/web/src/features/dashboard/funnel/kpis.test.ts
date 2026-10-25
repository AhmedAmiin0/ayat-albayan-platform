import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { kpisOf } from './kpis';

describe('kpisOf (docs/07 §6 KPI strip)', () => {
  it('four numbers in strip order, with their ar.json labels', () => {
    const k = kpisOf({ needs_confirmation: 3, pending_reports: 0, unpaid_subscriptions: 2, open_tasks: 0 });
    expect(k.map((x) => [x.key, x.value, x.label])).toEqual([
      ['needsConfirm', 3, t.enums.lessonStatus.scheduled],
      ['reports', 0, t.dashboard.pendingReports],
      ['unpaid', 2, t.dashboard.unpaidSubscriptions],
      ['tasks', 0, t.dashboard.tasks],
    ]);
  });

  it('saffron only when there is work behind the number', () => {
    const k = kpisOf({ needs_confirmation: 3, pending_reports: 0, unpaid_subscriptions: 2, open_tasks: 0 });
    expect(k.map((x) => x.act)).toEqual([true, false, true, false]);
  });
});
