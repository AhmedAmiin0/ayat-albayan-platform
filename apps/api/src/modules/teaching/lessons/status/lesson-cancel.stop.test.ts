import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { ruleRow } from '@/modules/teaching/scheduling/scheduling.fakes';
import type { ScheduleQueries } from '@/modules/teaching/scheduling/schedule.queries';
import {
  ADMIN,
  appliedChange,
  fakeStore,
  lessonRow,
  RULE_ID,
} from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { LessonCancelService } from './lesson-cancel.service';

// «إلغاء الاشتراك» (owner 2026-10-30): a rule of a stopped course ends on the cancel date in its
// zone, its open lessons from the stop instant cancelled by the admin side (not chargeable); one
// audited transaction.
const rules = { rule: vi.fn() };
const AT = new Date('2026-10-04T10:00:00Z'); // Sunday 13:00 Riyadh
const NEXT = { id: 'l2', status: 'confirmed' as const, starts_at: '2026-10-06T14:00:00+00:00' };

function setup() {
  const deps = fakeStore(lessonRow());
  const settings = readerOf(LessonsSettings, { booking_horizon_weeks: 5, late_cancel_hours: 6 });
  return {
    ...deps,
    service: new LessonCancelService(deps.store, rules as unknown as ScheduleQueries, settings),
  };
}

describe('LessonCancelService.stopRule', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers({ now: AT });
  });
  afterEach(() => vi.useRealTimers());

  it('cancels from the instant (a lesson earlier today stays for its report) and ends the rule today', async () => {
    rules.rule.mockResolvedValue(ruleRow({ ends_on: null }));
    const { service, writer, queries, record } = setup();
    queries.openOfRule.mockResolvedValue([NEXT]);
    expect(
      await service.stopRule({ ruleId: RULE_ID, at: AT, reason: 'سفر', actor: ADMIN }),
    ).toEqual(['l2']);
    expect(queries.openOfRule).toHaveBeenCalledWith(RULE_ID, AT);
    const change = appliedChange(writer);
    expect(change?.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-04' });
    expect(change?.changes).toEqual([
      {
        id: 'l2',
        from_status: 'confirmed',
        to_status: 'cancelled_by_admin',
        cancel_reason: 'سفر',
        chargeable: false,
      },
    ]);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'schedule_rules', action: 'cancel' }),
    );
  });

  it('never lengthens a rule that ends earlier', async () => {
    rules.rule.mockResolvedValue(ruleRow({ ends_on: '2026-10-01' }));
    const { service, writer } = setup();
    await service.stopRule({ ruleId: RULE_ID, at: AT, reason: 'سفر', actor: ADMIN });
    expect(appliedChange(writer)?.end_rule).toEqual({ id: RULE_ID, ends_on: '2026-10-01' });
  });

  it('an unknown rule is 404', async () => {
    rules.rule.mockResolvedValue(null);
    await expect(
      setup().service.stopRule({ ruleId: RULE_ID, at: AT, reason: 'x', actor: ADMIN }),
    ).rejects.toMatchObject({ status: 404 });
  });
});
