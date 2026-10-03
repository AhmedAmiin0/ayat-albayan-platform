import { ForbiddenException, HttpException } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLOSED, CONFIG, decode, EARLY, LESSON_ID, OPEN, queries, SALES } from './classroom.fakes';
import { grantsFor } from './livekit-token';
import { admissionOf, rolesOf } from './moderation.fakes';
import { RoomJoinService } from './room-join.service';
import { classroomApp } from './test-app';

let q: ReturnType<typeof queries>;
const join = (now: Date) =>
  new RoomJoinService(rolesOf({ q, teachers: { idByProfile: vi.fn() } }), admissionOf({ q, config: CONFIG })).join({ user: SALES, lessonId: LESSON_ID }, now);
const failure = async (p: Promise<unknown>) => ((await p.catch((e: unknown) => e)) as HttpException);

beforeEach(() => {
  q = queries();
});

describe('a salesperson joining a lesson (room-join)', () => {
  it('inside the window and the scope: role sales, staff grants, under their profile name', async () => {
    const r = await join(OPEN);
    expect(r.role).toBe('sales');
    expect(q.salesOwnsLesson).toHaveBeenCalledWith(SALES.id, LESSON_ID);
    expect(decode(r.token)).toMatchObject({ name: 'نور', video: grantsFor('sales', `lesson-${LESSON_ID}`) });
    expect(decode(r.token).sub.startsWith('sales-')).toBe(true);
    expect(q.teacherName).not.toHaveBeenCalled();
  });

  it('outside their scope: 403, even inside the window', async () => {
    q.salesOwnsLesson.mockResolvedValue(false);
    expect(await failure(join(OPEN))).toBeInstanceOf(ForbiddenException);
  });

  it('bound by the window like a teacher (not admin-anytime): early 403 join_not_open_yet, late 410 join_closed', async () => {
    expect((await failure(join(EARLY))).getResponse()).toMatchObject({ code: 'join_not_open_yet', opens_at: '2026-10-05T15:45:00.000Z' });
    const late = await failure(join(CLOSED));
    expect([late.getStatus(), late.getResponse()]).toEqual([410, expect.objectContaining({ code: 'join_closed' })]);
  });
});

describe('sales over HTTP', () => {
  let h: Awaited<ReturnType<typeof classroomApp>>;
  const url = `/lessons/${LESSON_ID}`;
  beforeAll(async () => {
    h = await classroomApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(OPEN);
    h.reset();
  });
  afterEach(() => vi.useRealTimers());

  it('POST room/join is allowed for sales in scope, 403 out of scope', async () => {
    const ok = await h.call({ method: 'POST', url: `${url}/room/join`, token: 'sales' });
    expect([ok.statusCode, ok.json().role]).toEqual([200, 'sales']);
    h.queries.salesOwnsLesson.mockResolvedValue(false);
    expect((await h.call({ method: 'POST', url: `${url}/room/join`, token: 'sales' })).statusCode).toBe(403);
  });

  it('the join-link routes stay closed to sales (send: admin; url: admin + teacher)', async () => {
    expect((await h.call({ method: 'POST', url: `${url}/join-link/url`, token: 'sales' })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: `${url}/join-link`, token: 'sales', body: {} })).statusCode).toBe(403);
  });
});
