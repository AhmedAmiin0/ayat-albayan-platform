import { describe, expect, it, vi } from 'vitest';
import { FamilyPushJob } from './family-push.job';
import type { FamilyPushService } from './family-push.service';

describe('FamilyPushJob', () => {
  it('one pass returns the summary; a failure is logged, never thrown', async () => {
    const summary = { lessons: 1, reports: 0, targets: 2 };
    const runOnce = vi.fn().mockResolvedValueOnce(summary).mockRejectedValueOnce(new Error('x'));
    const job = new FamilyPushJob({ runOnce } as unknown as FamilyPushService);
    expect(await job.runOnce()).toEqual(summary);
    expect(await job.runOnce()).toBeNull();
  });
});
