import { describe, expect, it, vi } from 'vitest';
import { CoursePauseJob } from './course-pause.job';
import type { CoursePauseQueries } from './course-pause.queries';
import type { CoursePauseService } from './course-pause.service';

function job() {
  const queries = { due: vi.fn(async () => ['p1', 'p2', 'p3']), dueStarts: vi.fn(async (): Promise<string[]> => []) };
  const pauses = { beginPause: vi.fn(async () => undefined), resumePause: vi.fn(async (id: string) => { if (id === 'p2') throw new Error('boom'); return {}; }) };
  return { queries, pauses, job: new CoursePauseJob(queries as unknown as CoursePauseQueries, pauses as unknown as CoursePauseService) };
}

describe('CoursePauseJob (automatic «استئناف» on the day after until)', () => {
  it('reads the pauses due before Riyadh today and resumes each with the job as actor; one failure never stops the rest', async () => {
    const t = job();
    // 22:00 UTC on the 10th is already the 11th in Riyadh.
    const summary = await t.job.runOnce(new Date('2026-11-10T22:00:00Z'));
    expect(t.queries.due).toHaveBeenCalledWith('2026-11-11');
    expect(t.pauses.resumePause.mock.calls).toEqual([['p1', null], ['p2', null], ['p3', null]]);
    expect(summary).toEqual({ begun: 0, due: 3, resumed: 2, failed: 1 });
  });

  it('begins the pauses from a later day on their Riyadh from day, before resuming', async () => {
    const t = job();
    t.queries.dueStarts.mockResolvedValue(['f1']);
    t.queries.due.mockResolvedValue([]);
    expect(await t.job.runOnce(new Date('2026-11-10T22:00:00Z'))).toEqual({ begun: 1, due: 0, resumed: 0, failed: 0 });
    expect(t.queries.dueStarts).toHaveBeenCalledWith('2026-11-11');
    expect(t.pauses.beginPause).toHaveBeenCalledWith('f1');
  });

  it('a re-run with nothing due does nothing (resumed pauses are no longer read)', async () => {
    const t = job();
    t.queries.due.mockResolvedValue([]);
    expect(await t.job.runOnce()).toEqual({ begun: 0, due: 0, resumed: 0, failed: 0 });
    expect(t.pauses.resumePause).not.toHaveBeenCalled();
  });

  it('never throws when the read fails', async () => {
    const t = job();
    t.queries.due.mockRejectedValue(new Error('db down'));
    await expect(t.job.runOnce()).resolves.toEqual({ begun: 0, due: 0, resumed: 0, failed: 0 });
  });
});
