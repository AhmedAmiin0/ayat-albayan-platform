import { HttpException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssistantLessonsQueries } from './assistants.lessons';
import type { AssistantsQueries } from './assistants.queries';
import { AssistantsService } from './assistants.service';
import { ADMIN, ASSISTANT, LESSON_ID, STUDENT_ID } from './classroom.fakes';

const A = { profile_id: ASSISTANT.id, full_name: 'نور' };
let q: Record<keyof AssistantsQueries, ReturnType<typeof vi.fn>>;
let lessons: { between: ReturnType<typeof vi.fn> };
const svc = () => new AssistantsService(q as unknown as AssistantsQueries, lessons as unknown as AssistantLessonsQueries);
const fail = async (p: Promise<unknown>) => (await p.catch((e: HttpException) => e)) as HttpException;

beforeEach(() => {
  q = {
    allAssistants: vi.fn().mockResolvedValue([A]),
    forStudent: vi.fn().mockResolvedValue([A]),
    studentExists: vi.fn().mockResolvedValue(true),
    isAssistant: vi.fn().mockResolvedValue(true),
    assign: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    studentIdsOf: vi.fn().mockResolvedValue([STUDENT_ID]),
    lessonRefs: vi.fn().mockResolvedValue([{ lesson_id: LESSON_ID, student_id: STUDENT_ID }]),
  };
  lessons = { between: vi.fn().mockResolvedValue([]) };
});

describe('assign and remove (admin)', () => {
  it('assigns an assistant login to a student and answers with the updated list', async () => {
    expect(await svc().assign({ studentId: STUDENT_ID, body: { profileId: ASSISTANT.id }, actorId: ADMIN.id })).toEqual([A]);
    expect(q.assign).toHaveBeenCalledWith({ studentId: STUDENT_ID, profileId: ASSISTANT.id, actorId: ADMIN.id });
  });

  it('400 not_an_assistant for a login whose role is not assistant', async () => {
    q.isAssistant.mockResolvedValue(false);
    const err = await fail(svc().assign({ studentId: STUDENT_ID, body: { profileId: ADMIN.id }, actorId: ADMIN.id }));
    expect(err.getStatus()).toBe(400);
    expect(err.getResponse()).toMatchObject({ code: 'not_an_assistant' });
    expect(q.assign).not.toHaveBeenCalled();
  });

  it('404 for an unknown student, 400 for a body without a uuid', async () => {
    q.studentExists.mockResolvedValue(false);
    expect((await fail(svc().assign({ studentId: STUDENT_ID, body: { profileId: ASSISTANT.id }, actorId: 'x' }))).getStatus()).toBe(404);
    expect((await fail(svc().assign({ studentId: STUDENT_ID, body: { profileId: 'nope' }, actorId: 'x' }))).getStatus()).toBe(400);
  });

  it('removes and answers with what is left', async () => {
    q.forStudent.mockResolvedValue([]);
    expect(await svc().remove(STUDENT_ID, ASSISTANT.id)).toEqual([]);
    expect(q.remove).toHaveBeenCalledWith(STUDENT_ID, ASSISTANT.id);
  });
});

describe('an assistant reads only their own sessions', () => {
  const query = { from: '2026-10-05T00:00:00.000Z', to: '2026-10-06T00:00:00.000Z' };

  it('scopes the lessons to the students assigned to the caller', async () => {
    await svc().mine({ profileId: ASSISTANT.id, query });
    expect(q.studentIdsOf).toHaveBeenCalledWith(ASSISTANT.id);
    expect(q.lessonRefs).toHaveBeenCalledWith([STUDENT_ID]);
    expect(lessons.between).toHaveBeenCalledWith([{ lesson_id: LESSON_ID, student_id: STUDENT_ID }], query);
  });

  it('with no assigned students nothing is asked for', async () => {
    q.studentIdsOf.mockResolvedValue([]);
    q.lessonRefs.mockResolvedValue([]);
    await svc().mine({ profileId: ASSISTANT.id, query });
    expect(lessons.between).toHaveBeenCalledWith([], query);
  });

  it('400 for a missing or malformed range', async () => {
    expect((await fail(svc().mine({ profileId: ASSISTANT.id, query: {} }))).getStatus()).toBe(400);
    expect((await fail(svc().mine({ profileId: ASSISTANT.id, query: { from: 'today', to: 'x' } }))).getStatus()).toBe(400);
  });
});
