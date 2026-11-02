import { describe, expect, it, vi } from 'vitest';
import { AutoHeldJob } from './auto-held.job';
import type { AutoHeldService } from './auto-held.service';

describe('AutoHeldJob', () => {
  it('one pass returns the summary; a failure is logged, never thrown', async () => {
    const runOnce = vi
      .fn()
      .mockResolvedValueOnce({ due: 1, held: 1, skipped: null })
      .mockRejectedValueOnce(new Error('x'));
    const job = new AutoHeldJob({ runOnce } as unknown as AutoHeldService);
    expect(await job.runOnce()).toEqual({ due: 1, held: 1, skipped: null });
    expect(await job.runOnce()).toBeNull();
  });
});
