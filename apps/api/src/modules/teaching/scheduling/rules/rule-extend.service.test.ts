import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import type { OccurrenceGenerator } from '../occurrences/occurrence-generator';
import { RuleExtendService } from './rule-extend.service';
import { ruleRow } from '../scheduling.fakes';
import { SchedulingSettings } from '../scheduling.settings';
import type { ScheduleQueries } from '../schedule.queries';

const rules = { rule: vi.fn() };
const generator = { topUp: vi.fn() };
const service = new RuleExtendService(
  rules as unknown as ScheduleQueries,
  generator as unknown as OccurrenceGenerator,
  readerOf(SchedulingSettings, { booking_horizon_weeks: 5 }),
);
const NEW = { id: 'l-new', starts_at: '2026-11-08T14:00:00.000Z', ends_at: '2026-11-08T14:45:00.000Z' };
const UNTIL = new Date('2026-11-13T10:00:00Z');

describe('RuleExtendService — POST /schedule-rules/:id/extend (R-SCH-02, R-SCH-04)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rules.rule.mockResolvedValue(ruleRow());
    generator.topUp.mockResolvedValue({ until: UNTIL, lessons: [NEW], conflicts: [] });
  });

  it('404 for an unknown rule', async () => {
    rules.rule.mockResolvedValue(null);
    await expect(service.extend({ ruleId: 'x', actorId: 'a' })).rejects.toMatchObject({ status: 404 });
  });

  it('409 rule_not_active for a paused or ended rule (only active rules are extended)', async () => {
    for (const status of ['paused', 'ended'] as const) {
      rules.rule.mockResolvedValue(ruleRow({ status }));
      await expect(service.extend({ ruleId: 'x', actorId: 'a' })).rejects.toMatchObject({
        response: { code: 'rule_not_active', message: 'rule_not_active' },
      });
    }
    expect(generator.topUp).not.toHaveBeenCalled();
  });

  it('tops up with the requested weeks and returns until / inserted / conflicts', async () => {
    const res = await service.extend({ ruleId: 'r', weeks: 6, actorId: 'admin-1' });
    expect(generator.topUp).toHaveBeenCalledWith(expect.objectContaining({ id: ruleRow().id }), {
      weeks: 6,
      actorId: 'admin-1',
    });
    expect(res).toEqual({ rule_id: ruleRow().id, until: UNTIL.toISOString(), inserted: 1, conflicts: [] });
  });

  it('weeks default to settings.booking_horizon_weeks; the new rows\' clashes are returned (never blocks)', async () => {
    const clash = { kind: 'teacher_busy', startsAt: NEW.starts_at, endsAt: NEW.ends_at, lessonId: 'other' };
    generator.topUp.mockResolvedValue({ until: UNTIL, lessons: [NEW], conflicts: [clash] });
    const res = await service.extend({ ruleId: 'r', actorId: 'admin-1' });
    expect(generator.topUp).toHaveBeenCalledWith(expect.anything(), { weeks: 5, actorId: 'admin-1' });
    expect(res.conflicts).toEqual([clash]);
    expect(res.inserted).toBe(1);
  });
});
