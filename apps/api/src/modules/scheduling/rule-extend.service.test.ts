import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConflictChecker } from './conflict-checker';
import type { OccurrenceGenerator } from './occurrence-generator';
import { RuleExtendService } from './rule-extend.service';
import { ruleRow, STUDENT_ID, TEACHER_ID } from './scheduling.fakes';
import type { ScheduleQueries } from './schedule.queries';

const rules = { rule: vi.fn() };
const generator = { topUp: vi.fn() };
const checker = { check: vi.fn() };
const service = new RuleExtendService(
  rules as unknown as ScheduleQueries,
  generator as unknown as OccurrenceGenerator,
  checker as unknown as ConflictChecker,
);
const NEW = { id: 'l-new', starts_at: '2026-11-08T14:00:00.000Z', ends_at: '2026-11-08T14:45:00.000Z' };

describe('RuleExtendService — POST /schedule-rules/:id/extend (R-SCH-02, R-SCH-04)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    rules.rule.mockResolvedValue(ruleRow());
    generator.topUp.mockResolvedValue({ until: new Date('2026-11-13T10:00:00Z'), lessons: [NEW] });
    checker.check.mockResolvedValue([]);
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
    expect(res).toEqual({ rule_id: ruleRow().id, until: '2026-11-13T10:00:00.000Z', inserted: 1, conflicts: [] });
  });

  it('checks clashes for the new rows only, excluding them from "busy" (never blocks)', async () => {
    const clash = { kind: 'teacher_busy', startsAt: NEW.starts_at, endsAt: NEW.ends_at, lessonId: 'other' };
    checker.check.mockResolvedValue([clash]);
    const res = await service.extend({ ruleId: 'r', actorId: 'admin-1' });
    expect(checker.check).toHaveBeenCalledWith({
      teacherId: TEACHER_ID,
      studentIds: [STUDENT_ID],
      proposed: [{ starts_at: new Date(NEW.starts_at), ends_at: new Date(NEW.ends_at) }],
      excludeIds: ['l-new'],
    });
    expect(res.conflicts).toEqual([clash]);
    expect(res.inserted).toBe(1);
  });
});
