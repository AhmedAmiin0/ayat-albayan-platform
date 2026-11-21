import type { JobBeat } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import type { BeatReader } from '@/common/jobs/beats';
import { JobsStatusController } from './jobs-status.controller';

const beat: JobBeat = { name: 'a', everyMs: 1_000, since: 0, lastOkAt: 0, lastErrorAt: null, lastError: null };
const reader = (beats: JobBeat[] | null) => ({ read: async () => beats }) as unknown as BeatReader;

describe('GET /admin/jobs', () => {
  it('lists every job the worker reports', async () => {
    const res = await new JobsStatusController(reader([beat])).list();
    expect(res.data.map((r) => r.name)).toEqual(['a']);
  });

  it('nothing visible here (no Redis): an empty list, never an error', async () => {
    expect(await new JobsStatusController(reader(null)).list()).toEqual({ data: [] });
  });
});
