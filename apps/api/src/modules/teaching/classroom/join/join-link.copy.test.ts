import { ForbiddenException, HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import type { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { ADMIN, ASSISTANT, GUARDIAN, LESSON_ID, OTHER_TEACHER, queries, TEACHER, TEACHER_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { JoinLinkCopyService } from './join-link.copy.service';
import { hashLinkToken } from './join-link.token';

let q: ReturnType<typeof queries>;
let teachers: { idByProfile: ReturnType<typeof vi.fn> };
const url = (user = ADMIN) =>
  new JoinLinkCopyService(q as unknown as ClassroomRepo, teachers as unknown as TeachersRepo, 'https://app.example.test').url({ lessonId: LESSON_ID, user });

beforeEach(() => {
  q = queries();
  teachers = { idByProfile: vi.fn(async (id: string) => (id === TEACHER.id ? TEACHER_ID : id === OTHER_TEACHER.id ? 'other' : null)) };
});

describe('«انسخ رابط الطالب»', () => {
  it('gives the admin a /join/<token> URL on the web origin, expiring with the classroom', async () => {
    const r = await url();
    expect(r.url).toMatch(/^https:\/\/app\.example\.test\/join\/[A-Za-z0-9_-]{32}$/);
    expect(r.expires_at).toBe('2026-10-05T19:00:00.000Z');
  });

  it('stores only the hash of the token it handed out', async () => {
    const r = await url();
    const token = r.url.split('/join/')[1] ?? '';
    expect(q.insertLink).toHaveBeenCalledWith({ lesson_id: LESSON_ID, token_hash: hashLinkToken(token), expires_at: r.expires_at, created_by: ADMIN.id });
    expect(JSON.stringify(q.insertLink.mock.calls)).not.toContain(token);
  });

  it("the lesson's own teacher may; another teacher, an assistant and a guardian may not", async () => {
    expect((await url(TEACHER)).url).toContain('/join/');
    for (const user of [OTHER_TEACHER, ASSISTANT, GUARDIAN]) await expect(url(user)).rejects.toBeInstanceOf(ForbiddenException);
    expect(q.insertLink).toHaveBeenCalledTimes(1);
  });

  it('every call is a new link', async () => {
    expect((await url()).url).not.toBe((await url()).url);
  });

  it('404 for an unknown lesson', async () => {
    q.lesson.mockResolvedValue(null);
    expect(((await url().catch((e: HttpException) => e)) as HttpException).getStatus()).toBe(404);
  });
});
