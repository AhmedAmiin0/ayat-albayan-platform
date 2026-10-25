import { ForbiddenException, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ClassroomQueries } from '../classroom.queries';
import { ADMIN, ASSISTANT, CLOSED, EARLY, LESSON, LESSON_ID, OTHER_TEACHER, queries, SALES, TEACHER } from '../classroom.fakes';
import { rolesOf } from '../moderation.fakes';
import { RoomOpenService } from './room-open.service';

let q: ReturnType<typeof queries>;
const open = (user = TEACHER, now = EARLY) =>
  new RoomOpenService(rolesOf({ q }), q as unknown as ClassroomQueries).open({ user, lessonId: LESSON_ID }, now);
const body = async (p: Promise<unknown>) => ((await p.catch((e: HttpException) => e)) as HttpException).getResponse();

beforeEach(() => {
  q = queries();
});

describe('«افتح الحلقة الآن»', () => {
  it('the lesson teacher opens the room an hour early: stamped now, the window is open', async () => {
    const r = await open(TEACHER, EARLY);
    expect(q.openRoom).toHaveBeenCalledWith(LESSON_ID, EARLY.toISOString());
    expect(r).toMatchObject({ state: 'open', opens_at: EARLY.toISOString(), room_opened_at: EARLY.toISOString() });
  });

  it('an admin may open it too', async () => {
    expect((await open(ADMIN)).state).toBe('open');
  });

  it('is idempotent: an already opened room keeps its first time and is not written again', async () => {
    const first = '2026-10-05T14:30:00.000Z';
    q.lesson.mockResolvedValue({ ...LESSON, room_opened_at: first });
    const r = await open(TEACHER, EARLY);
    expect(q.openRoom).not.toHaveBeenCalled();
    expect(r).toMatchObject({ state: 'open', opens_at: first, room_opened_at: first });
  });

  it('not another teacher, an assistant or a salesperson', async () => {
    await expect(open(OTHER_TEACHER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(open(ASSISTANT)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(open(SALES)).rejects.toBeInstanceOf(ForbiddenException);
    expect(q.openRoom).not.toHaveBeenCalled();
  });

  it('409 lesson_not_open for a cancelled or held lesson', async () => {
    q.lesson.mockResolvedValue({ ...LESSON, status: 'cancelled_by_admin' });
    expect(await body(open())).toMatchObject({ code: 'lesson_not_open' });
    q.lesson.mockResolvedValue({ ...LESSON, status: 'completed' });
    expect(await body(open())).toMatchObject({ code: 'lesson_not_open' });
  });

  it('410 join_closed once the room has closed', async () => {
    expect(await body(open(TEACHER, CLOSED))).toMatchObject({ code: 'join_closed' });
  });

  it('404 lesson_not_found for an unknown lesson', async () => {
    q.lesson.mockResolvedValue(null);
    expect(await body(open())).toMatchObject({ code: 'lesson_not_found' });
  });
});
