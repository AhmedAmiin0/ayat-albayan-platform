import { describe, expect, it } from 'vitest';
import { answerOfRejection, PG_ERRORS } from '@/common/db/testing/db-answer';
import { fakeDb } from '@/common/db/testing/fake-db';
import { RoomPresenceRepo } from '@/modules/teaching/classroom/live/room-presence.repo';

const E = { lessonId: 'l1', identity: 'guest-1', at: '2026-11-16T10:00:00.000Z' };
const ORDER = 'presence_at.is.null,presence_at.lt.2026-11-16T10:00:00.000Z';
const DUPLICATE = { status: 409, body: { message: 'duplicate', detail: PG_ERRORS.unique.details } };
const FAILED = { status: 500, body: 'db error XX000: boom' };

describe("RoomPresenceRepo: LiveKit's order", () => {
  it('a join applies only over an older stamp, and stamps the event time', async () => {
    const { db, argsOf } = fakeDb({
      classroom_participants: [{ data: { role: 'teacher' } }, { data: null }],
    });
    await expect(new RoomPresenceRepo(db).entered(E)).resolves.toEqual({ role: 'teacher' });
    expect(argsOf('classroom_participants', 'update')).toEqual([
      { left_at: null, presence_at: E.at },
    ]);
    expect(argsOf('classroom_participants', 'or')).toEqual([ORDER]);
  });

  it('a stale join (the row holds a newer event) changes nothing more and answers null', async () => {
    const { db, trips } = fakeDb({ classroom_participants: [{ data: null }] });
    await expect(new RoomPresenceRepo(db).entered(E)).resolves.toBeNull();
    expect(trips).toHaveLength(1);
  });

  it('a leave is ordered the same way', async () => {
    const { db, argsOf } = fakeDb({ classroom_participants: [{ data: null }] });
    await new RoomPresenceRepo(db).left(E);
    expect(argsOf('classroom_participants', 'update')).toEqual([
      { left_at: E.at, presence_at: E.at },
    ]);
    expect(argsOf('classroom_participants', 'or')).toEqual([ORDER]);
  });
});

describe('RoomPresenceRepo error paths: the answer a failed query gives today', () => {
  it('a unique violation is 409 duplicate with the detail', async () => {
    const { db } = fakeDb({ classroom_participants: [{ error: PG_ERRORS.unique }] });
    expect(await answerOfRejection(new RoomPresenceRepo(db).entered(E))).toEqual(DUPLICATE);
  });

  it('any other error is a 500 naming the code', async () => {
    const { db } = fakeDb({ classroom_participants: [{ error: PG_ERRORS.other }] });
    expect(await answerOfRejection(new RoomPresenceRepo(db).entered(E))).toEqual(FAILED);
  });
});
