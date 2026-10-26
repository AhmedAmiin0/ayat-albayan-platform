import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CLOSED, CONFIG, decode, EARLY, LESSON_ID, OPEN, queries, STUDENT_ID } from '../classroom.fakes';
import { PublicJoinLimit } from '../join/join-limit';
import { hashLinkToken } from '../join/join-link.token';
import { admissionOf, moderation, recorder } from '../moderation/moderation.fakes';
import { LATER_LESSON, LESSON_LINK_ID, STUDENT_LESSON, STUDENT_TOKEN, studentLinkQueries } from './student-link.fakes';
import type { StudentLinkQueries } from './student-link.queries';
import { StudentLinkService } from './student-link.service';

let q: ReturnType<typeof studentLinkQueries>;
let mod: ReturnType<typeof moderation>;
const service = (limit = new PublicJoinLimit()) =>
  new StudentLinkService(q as unknown as StudentLinkQueries, limit, admissionOf({ q: queries(), mod, rec: recorder(), config: CONFIG }));
const view = (now = OPEN, token = STUDENT_TOKEN) => service().view({ token, ip: '9.9.9.9' }, now);
const join = (over: { now?: Date; body?: unknown; token?: string } = {}) =>
  service().join({ token: over.token ?? STUDENT_TOKEN, ip: '9.9.9.9', body: over.body }, over.now ?? OPEN);
const body = async (p: Promise<unknown>) => ((await p.catch((e: HttpException) => e)) as HttpException).getResponse();

beforeEach(() => {
  q = studentLinkQueries();
  mod = moderation();
});

describe('GET /public/student/:token', () => {
  it('finds the link by the sha256 of its token, greets by first name and shows the open lesson', async () => {
    const r = await view(OPEN);
    expect(q.linkByHash).toHaveBeenCalledWith(hashLinkToken(STUDENT_TOKEN));
    expect(r.first_name).toBe('سهيلة');
    expect(r.lesson).toMatchObject({ id: LESSON_ID, teacher_name: 'أبرار', window: { state: 'open' } });
  });

  it('before the window: the next lesson, early, with opens_at', async () => {
    const r = await view(EARLY);
    expect(r.lesson?.window).toMatchObject({ state: 'early', opens_at: '2026-10-05T15:45:00.000Z' });
  });

  it('after the room closed: moves on to the next lesson', async () => {
    expect((await view(CLOSED)).lesson?.id).toBe(LATER_LESSON.id);
  });

  it('nothing booked: lesson null', async () => {
    q.lessonsAhead.mockResolvedValue([]);
    expect((await view()).lesson).toBeNull();
  });

  it('404 link_invalid for a malformed or unknown token (no lookup for the malformed one), 410 for a revoked one', async () => {
    expect(await body(view(OPEN, 'short'))).toMatchObject({ code: 'link_invalid' });
    expect(q.linkByHash).not.toHaveBeenCalled();
    expect(await body(view(OPEN, 'A'.repeat(32)))).toMatchObject({ code: 'link_invalid' });
    q.linkByHash.mockResolvedValue({ id: 'sl1', student_id: STUDENT_ID, revoked_at: '2026-10-01T00:00:00Z' });
    expect(await body(view())).toMatchObject({ code: 'link_expired' });
  });
});

describe('POST /public/student/:token/join', () => {
  it('admits a guest into the open lesson by its (lesson, student) link, named by first name', async () => {
    const r = await join();
    expect(r).toMatchObject({ role: 'guest', room: `lesson-${LESSON_ID}` });
    expect(decode(r.token).name).toBe('سهيلة');
    expect(q.lessonLinkId).toHaveBeenCalledWith({ lesson: STUDENT_LESSON, studentId: STUDENT_ID });
    expect(mod.addParticipant).toHaveBeenCalledWith(expect.objectContaining({ join_link_id: LESSON_LINK_ID, role: 'guest' }));
  });

  it('uses the typed name when given', async () => {
    expect(decode((await join({ body: { name: 'أم سهيلة' } })).token).name).toBe('أم سهيلة');
  });

  it('403 join_not_open_yet with opens_at before the window', async () => {
    expect(await body(join({ now: EARLY }))).toMatchObject({ code: 'join_not_open_yet', opens_at: '2026-10-05T15:45:00.000Z' });
    expect(q.lessonLinkId).not.toHaveBeenCalled();
  });

  it('a room opened early by staff lets the student in', async () => {
    q.lessonsAhead.mockResolvedValue([{ ...STUDENT_LESSON, room_opened_at: '2026-10-05T14:30:00.000Z' }]);
    expect((await join({ now: EARLY })).role).toBe('guest');
  });

  it('403 removed_from_room when that (lesson, student) link was removed', async () => {
    mod.isBlocked.mockResolvedValue(true);
    expect(await body(join())).toMatchObject({ code: 'removed_from_room' });
    expect(mod.isBlocked).toHaveBeenCalledWith(LESSON_ID, { joinLinkId: LESSON_LINK_ID });
  });

  it('404 no_lesson when nothing is booked, 400 for a blank name', async () => {
    q.lessonsAhead.mockResolvedValue([]);
    expect(await body(join())).toMatchObject({ code: 'no_lesson' });
    expect((await join({ body: { name: ' ' } }).catch((e: HttpException) => e)) instanceof HttpException).toBe(true);
  });

  it('429 after the public join limit (10 joins per link and IP)', async () => {
    const svc = service(new PublicJoinLimit());
    for (let i = 0; i < 10; i++) await svc.join({ token: STUDENT_TOKEN, ip: '1.1.1.1', body: {} }, OPEN);
    expect(await body(svc.join({ token: STUDENT_TOKEN, ip: '1.1.1.1', body: {} }, OPEN))).toMatchObject({ code: 'too_many_requests' });
  });

  it('page polling (every 30 s for 10 minutes) never uses up the join', async () => {
    const svc = service(new PublicJoinLimit());
    for (let i = 0; i < 20; i++) await svc.view({ token: STUDENT_TOKEN, ip: '1.1.1.2' }, OPEN);
    expect((await svc.join({ token: STUDENT_TOKEN, ip: '1.1.1.2', body: {} }, OPEN)).role).toBe('guest');
  });
});
