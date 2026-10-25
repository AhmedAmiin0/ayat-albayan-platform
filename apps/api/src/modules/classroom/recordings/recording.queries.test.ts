import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../guardians/fake-db';
import { RecordingQueries } from './recording.queries';
import { meetingTarget } from './recording-target';

describe('RecordingQueries for meetings (migration 212)', () => {
  it('a meeting’s claim fills meeting_id, never lesson_id', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: { id: 'R1' } }] });
    await new RecordingQueries(f.db).claim({ target: meetingTarget('M'), filePath: 'meetings/M/x.mp3', startedAt: 't' });
    expect(f.argsOf('lesson_recordings', 'insert')?.[0]).toEqual({ meeting_id: 'M', file_path: 'meetings/M/x.mp3', started_at: 't' });
  });

  it('lists and finds the running egress by the meeting column', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: [] }, { data: { egress_id: 'EG_1' } }, { data: null }] });
    const q = new RecordingQueries(f.db);
    expect(await q.forTarget(meetingTarget('M'))).toEqual([]);
    expect(await q.runningEgress(meetingTarget('M'))).toBe('EG_1');
    expect(await q.runningEgress(meetingTarget('M'))).toBeNull();
    const eqs = f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs.slice(0, 3)).toEqual([['meeting_id', 'M'], ['meeting_id', 'M'], ['status', 'recording']]);
  });
});
