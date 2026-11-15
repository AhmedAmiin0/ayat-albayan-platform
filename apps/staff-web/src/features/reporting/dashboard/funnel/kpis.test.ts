import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { kpisOf } from './kpis';

const COUNTS = { needs_confirmation: 3, pending_reports: 0, unpaid_subscriptions: 2, open_tasks: 0 };

describe('kpisOf (docs/07 §6 KPI strip)', () => {
  it('four numbers in strip order, with their ar.json labels', () => {
    const k = kpisOf(COUNTS, true);
    expect(k.map((x) => [x.key, x.value, x.label])).toEqual([
      ['needsConfirm', 3, t.enums.lessonStatus.scheduled],
      ['reports', 0, t.dashboard.pendingReports],
      ['unpaid', 2, t.dashboard.unpaidSubscriptions],
      ['tasks', 0, t.dashboard.tasks],
    ]);
  });

  it('saffron only when there is work behind the number', () => {
    const k = kpisOf(COUNTS, true);
    expect(k.map((x) => x.act)).toEqual([true, false, true, false]);
  });

  it('no confirmation required: no «يحتاج تأكيد» tile at all (not a 0)', () => {
    const k = kpisOf({ ...COUNTS, needs_confirmation: 0, pending_reports: 1 }, false);
    expect(k.map((x) => x.key)).toEqual(['reports', 'unpaid', 'tasks']);
    expect(k.map((x) => x.label)).not.toContain(t.enums.lessonStatus.scheduled);
  });
});
