import { ForbiddenException, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN, ASSISTANT, CLOSED, CONFIG, decode, EARLY, GUARDIAN, LESSON_ID, OPEN, OTHER_TEACHER, queries, TEACHER, TEACHER_ID } from '../classroom.fakes';
import { admissionOf, moderation, recorder, rolesOf } from '../moderation/moderation.fakes';
import { RoomJoinService } from './room-join.service';
import { readerOf } from '../../../../common/settings/settings.fakes';
import { ClassroomSettings } from '../classroom.settings';

let q: ReturnType<typeof queries>;
let teachers: { idByProfile: ReturnType<typeof vi.fn> };
let mod: ReturnType<typeof moderation>;
let rec: ReturnType<typeof recorder>;
const service = (config: typeof CONFIG | null = CONFIG) => new RoomJoinService(rolesOf({ q, teachers }), admissionOf({ q, mod, rec, config }), readerOf(ClassroomSettings));
const join = (user = TEACHER, now = OPEN, svc = service()) => svc.join({ user, lessonId: LESSON_ID }, now);
const code = async (p: Promise<unknown>) => ((await p.catch((e: HttpException) => e)) as HttpException).getResponse();

beforeEach(() => {
  q = queries();
  mod = moderation();
  rec = recorder();
  teachers = {
    idByProfile: vi.fn(async (id: string) => (id === TEACHER.id ? TEACHER_ID : id === OTHER_TEACHER.id ? 'other' : null)),
  };
});

describe('who may join', () => {
  it('the teacher of the lesson, as teacher, under their display name', async () => {
    const r = await join(TEACHER);
    expect(r).toMatchObject({ role: 'teacher', room: `lesson-${LESSON_ID}`, url: CONFIG.url });
    expect(decode(r.token)).toMatchObject({ name: 'أبرار', iss: CONFIG.apiKey });
    expect(decode(r.token).video.room).toBe(`lesson-${LESSON_ID}`);
  });

  it('any admin, as admin, under their profile name', async () => {
    const r = await join(ADMIN);
    expect(r.role).toBe('admin');
    expect(decode(r.token).name).toBe('نور');
    expect(q.teacherName).not.toHaveBeenCalled();
  });

  it('an assistant assigned to one of the lesson students', async () => {
    const r = await join(ASSISTANT);
    expect(r.role).toBe('assistant');
    expect(q.assistsLesson).toHaveBeenCalledWith(ASSISTANT.id, LESSON_ID);
  });

  it('not another teacher', async () => {
    await expect(join(OTHER_TEACHER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('not an assistant of other students', async () => {
    q.assistsLesson.mockResolvedValue(false);
    await expect(join(ASSISTANT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('not a guardian, nor a login without a role', async () => {
    await expect(join(GUARDIAN)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(join({ id: 'x', email: null, role: null })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('a teacher whose login has no teachers row is refused', async () => {
    teachers.idByProfile.mockResolvedValue(null);
    await expect(join(TEACHER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404 lesson_not_found for an unknown lesson', async () => {
    q.lesson.mockResolvedValue(null);
    expect(await code(join())).toMatchObject({ code: 'lesson_not_found' });
  });
});

describe('the window', () => {
  it('teachers and assistants wait for 15 minutes before the start (403 with opens_at)', async () => {
    for (const user of [TEACHER, ASSISTANT]) {
      expect(await code(join(user, EARLY))).toMatchObject({ code: 'join_not_open_yet', opens_at: '2026-10-05T15:45:00.000Z' });
    }
  });

  it('and are turned away 2 hours after the lesson ends (410)', async () => {
    const err = (await join(TEACHER, CLOSED).catch((e: HttpException) => e)) as HttpException;
    expect(err.getStatus()).toBe(410);
    expect(err.getResponse()).toMatchObject({ code: 'join_closed' });
  });

  it('an admin may enter at any time', async () => {
    expect((await join(ADMIN, EARLY)).role).toBe('admin');
    expect((await join(ADMIN, CLOSED)).role).toBe('admin');
  });
});

describe('the token', () => {
  it('has a fresh identity on every call, even for the same person', async () => {
    const subs = await Promise.all(Array.from({ length: 20 }, () => join(TEACHER))).then((rs) => rs.map((r) => decode(r.token).sub));
    expect(new Set(subs).size).toBe(20);
    expect(subs.every((s) => s.startsWith('teacher-'))).toBe(true);
  });

  it('expires within a few hours of now', async () => {
    const c = decode((await join()).token);
    expect(c.exp - OPEN.getTime() / 1000).toBe(4 * 3600);
  });

  it('503 classroom_not_configured when LIVEKIT_* are not set', async () => {
    const err = (await join(TEACHER, OPEN, service(null)).catch((e: HttpException) => e)) as HttpException;
    expect(err.getStatus()).toBe(503);
    expect(err.getResponse()).toMatchObject({ code: 'classroom_not_configured' });
  });
});
