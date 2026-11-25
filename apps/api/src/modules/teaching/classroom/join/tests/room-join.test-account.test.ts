import type { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestFlagReader } from '@/common/auth/test-flag';
import type { AuthUser } from '@/common/auth/verify-token';
import { readerOf } from '@/common/settings/settings.fakes';
import { CONFIG, EARLY, LESSON_ID, queries, TEACHER, TEACHER_ID } from '@/modules/teaching/classroom/classroom.fakes';
import { ClassroomSettings } from '@/modules/teaching/classroom/classroom.settings';
import { admissionOf, moderation, recorder, rolesOf } from '@/modules/teaching/classroom/moderation/moderation.fakes';
import { RoomJoinService } from '@/modules/teaching/classroom/join/room-join.service';

// Test accounts (docs/56) on POST /lessons/:id/room/join: the window is skipped only for a test
// login on a lesson whose students are all test students; the role check never is.

let q: ReturnType<typeof queries>;
const lessonIsTest = vi.fn<(id: string) => Promise<boolean>>();
const service = () =>
  new RoomJoinService(
    rolesOf({ q, teachers: { idByProfile: vi.fn(async () => TEACHER_ID) } }),
    admissionOf({ q, mod: moderation(), rec: recorder(), config: CONFIG }),
    readerOf(ClassroomSettings),
    { ofLesson: lessonIsTest } as unknown as TestFlagReader,
  );
const join = (user: AuthUser) => service().join({ user, lessonId: LESSON_ID }, EARLY);
const codeOf = async (p: Promise<unknown>) =>
  ((await p.catch((e: unknown) => e)) as HttpException).getResponse();

beforeEach(() => {
  q = queries();
  lessonIsTest.mockReset();
});

describe('the staff room join before the window', () => {
  it('a test teacher on a test lesson enters', async () => {
    lessonIsTest.mockResolvedValue(true);
    await expect(join({ ...TEACHER, isTest: true })).resolves.toMatchObject({ role: 'teacher' });
    expect(lessonIsTest).toHaveBeenCalledWith(LESSON_ID);
  });

  it('a test teacher on a real lesson is refused join_not_open_yet', async () => {
    lessonIsTest.mockResolvedValue(false);
    expect(await codeOf(join({ ...TEACHER, isTest: true }))).toMatchObject({ code: 'join_not_open_yet' });
  });

  it('a real teacher on a test lesson is refused, and the lesson is not even read', async () => {
    lessonIsTest.mockResolvedValue(true);
    expect(await codeOf(join(TEACHER))).toMatchObject({ code: 'join_not_open_yet' });
    expect(lessonIsTest).not.toHaveBeenCalled();
  });

  it('a test login with no role in the lesson is still 403', async () => {
    lessonIsTest.mockResolvedValue(true);
    const stranger: AuthUser = { id: 'x', email: null, role: 'guardian', isTest: true };
    await expect(join(stranger)).rejects.toMatchObject({ status: 403 });
  });
});
