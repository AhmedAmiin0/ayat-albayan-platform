import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../guardians/fake-db';
import { egressOutcome } from './livekit-webhook';
import { RecordingQueries } from '../recordings/recording.queries';
import { lessonTarget } from '../recordings/recording-target';

const NOW = new Date('2026-10-05T17:00:00Z');
const ended = (info: object) => egressOutcome({ event: 'egress_ended', egressInfo: { egressId: 'EG_1', status: 'EGRESS_COMPLETE', ...info } }, NOW);

describe('the finished file’s size (migration 240)', () => {
  it('is read from the first file result (int64 as a string, camel or snake case)', () => {
    expect(ended({ fileResults: [{ size: '52428800' }] })?.sizeBytes).toBe(52_428_800);
    expect(ended({ file_results: [{ size: 10 }] })?.sizeBytes).toBe(10);
  });

  it('is absent when the result has none, is not a number, or the egress failed', () => {
    expect(ended({})).not.toHaveProperty('sizeBytes');
    expect(ended({ fileResults: [{ size: 'big' }] })).not.toHaveProperty('sizeBytes');
    expect(ended({ status: 'EGRESS_FAILED', fileResults: [{ size: '5' }] })).not.toHaveProperty('sizeBytes');
  });

  it('finishByEgress writes size_bytes only when it is known', async () => {
    const f = fakeDb({ lesson_recordings: [{}, {}] });
    const q = new RecordingQueries(f.db);
    await q.finishByEgress('EG', { status: 'done', endedAt: 't', sizeBytes: 7 });
    await q.finishByEgress('EG', { status: 'done', endedAt: 't' });
    const updates = f.calls.filter((c) => c.method === 'update').map((c) => c.args[0]);
    expect(updates).toEqual([{ status: 'done', ended_at: 't', error: null, size_bytes: 7 }, { status: 'done', ended_at: 't', error: null }]);
  });

  it('the live-room list leaves removed recordings out', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [] }] });
    await new RecordingQueries(f.db).forTarget(lessonTarget('L'));
    expect(f.argsOf('lesson_recordings', 'neq')).toEqual(['status', 'deleted']);
  });
});
