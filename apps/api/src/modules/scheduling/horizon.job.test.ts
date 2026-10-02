import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HorizonJob } from './horizon.job';
import type { OccurrenceGenerator } from './occurrence-generator';
import { fakeSettings, ruleRow } from './scheduling.fakes';
import type { ScheduleQueries } from './schedule.queries';

const rules = { activeRuleIds: vi.fn(), rule: vi.fn(), endExpired: vi.fn() };
const generator = { topUp: vi.fn() };
const NOW = new Date('2026-10-02T03:00:00Z');

function job() {
  return new HorizonJob(
    rules as unknown as ScheduleQueries,
    generator as unknown as OccurrenceGenerator,
    fakeSettings(5),
  );
}

describe('HorizonJob — daily refresh of active rules (R-SCH-02)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    rules.activeRuleIds.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }]);
    rules.rule.mockImplementation(async (id: string) => ruleRow({ id }));
    generator.topUp.mockResolvedValue({ until: NOW, lessons: [{ id: 'x' }] });
    rules.endExpired.mockResolvedValue(0);
  });
  afterEach(() => vi.useRealTimers());

  it('tops up every active rule as the system (actor null) with the settings horizon', async () => {
    const summary = await job().runOnce(NOW);
    expect(rules.activeRuleIds).toHaveBeenCalledWith('2026-10-01');
    expect(generator.topUp).toHaveBeenCalledTimes(3);
    expect(generator.topUp).toHaveBeenCalledWith(expect.objectContaining({ id: 'r1' }), {
      weeks: 5,
      actorId: null,
      now: NOW,
    });
    expect(summary).toEqual({ rules: 3, inserted: 3, failed: 0, ended: 0 });
  });

  it('skips a rule that stopped being active, and one failing rule does not stop the rest', async () => {
    rules.rule.mockImplementation(async (id: string) =>
      id === 'r1' ? ruleRow({ id, status: 'paused' }) : ruleRow({ id }),
    );
    generator.topUp.mockImplementation(async (rule: { id: string }) => {
      if (rule.id === 'r2') throw new Error('db down');
      return { until: NOW, lessons: [] };
    });
    const summary = await job().runOnce(NOW);
    expect(generator.topUp).toHaveBeenCalledTimes(2);
    expect(summary).toEqual({ rules: 3, inserted: 0, failed: 1, ended: 0 });
  });

  it('never throws, even when the rule list cannot be read', async () => {
    rules.activeRuleIds.mockRejectedValue(new Error('db down'));
    await expect(job().runOnce(NOW)).resolves.toEqual({ rules: 0, inserted: 0, failed: 0, ended: 0 });
  });

  it('first ends the rules whose end date is before UTC yesterday (R-SCH-07)', async () => {
    rules.endExpired.mockResolvedValue(2);
    const summary = await job().runOnce(NOW);
    expect(rules.endExpired).toHaveBeenCalledWith('2026-10-01');
    expect(summary.ended).toBe(2);
  });

  it('first runs a few minutes after boot (not on boot), then daily, and stops on shutdown', async () => {
    vi.useFakeTimers();
    const j = job();
    const run = vi.spyOn(j, 'runOnce').mockResolvedValue({ rules: 0, inserted: 0, failed: 0, ended: 0 });
    j.onApplicationBootstrap();
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(86_400_000);
    expect(run).toHaveBeenCalledTimes(2);
    j.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(2 * 86_400_000);
    expect(run).toHaveBeenCalledTimes(2);
  });
});
