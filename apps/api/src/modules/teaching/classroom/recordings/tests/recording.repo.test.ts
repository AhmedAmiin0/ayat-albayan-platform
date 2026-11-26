import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { RecordingRepo } from '@/modules/teaching/classroom/recordings/recording.repo';
import { meetingTarget } from '@/modules/teaching/classroom/recordings/recording-target';

const DUPLICATE = { status: 409, body: { message: 'duplicate' } };
const FAILED = { status: 500, body: 'db error XX000: boom' };
describe('RecordingQueries for meetings (migration 212)', () => {
  it('a meeting’s claim fills meeting_id, never lesson_id', async () => {
    const f = fakeDb({ lesson_recordings: [{ data: { id: 'R1' } }] });
    await new RecordingRepo(f.db).claim({
      target: meetingTarget('M'),
      filePath: 'meetings/M/x.mp3',
      startedAt: 't',
    });
    expect(f.argsOf('lesson_recordings', 'insert')?.[0]).toEqual({
      meeting_id: 'M',
      file_path: 'meetings/M/x.mp3',
      started_at: 't',
    });
  });

  it('lists and finds the running egress by the meeting column', async () => {
    const f = fakeDb({
      lesson_recordings: [{ data: [] }, { data: { egress_id: 'EG_1' } }, { data: null }],
    });
    const q = new RecordingRepo(f.db);
    expect(await q.forTarget(meetingTarget('M'))).toEqual([]);
    expect(await q.runningEgress(meetingTarget('M'))).toBe('EG_1');
    expect(await q.runningEgress(meetingTarget('M'))).toBeNull();
    const eqs = f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs.slice(0, 3)).toEqual([
      ['meeting_id', 'M'],
      ['meeting_id', 'M'],
      ['status', 'recording'],
    ]);
  });
});

describe('RecordingRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate', async () => {
    const { db } = fakeDb({ lesson_recordings: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new RecordingRepo(db).attachEgress('R1', 'EG_1'))).toEqual(
      DUPLICATE,
    );
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ lesson_recordings: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new RecordingRepo(db).attachEgress('R1', 'EG_1'))).toEqual(
      FAILED,
    );
  });
});
