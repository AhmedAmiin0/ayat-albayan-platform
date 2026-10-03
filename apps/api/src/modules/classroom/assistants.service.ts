import { assignAssistantSchema, type AssistantLessonView, type AssistantView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { badRequest, notFound } from '../scheduling/errors';
import { parseOrThrow } from '../teachers/http';
import { AssistantLessonsQueries } from './assistants.lessons';
import { AssistantsQueries } from './assistants.queries';

export const rangeSchema = z.object({ from: z.iso.datetime(), to: z.iso.datetime() });

/** The admin's assistants manager and the assistant's own list. An assistant never sees another's students. */
@Injectable()
export class AssistantsService {
  constructor(
    private readonly queries: AssistantsQueries,
    private readonly lessons: AssistantLessonsQueries,
  ) {}

  all(): Promise<AssistantView[]> {
    return this.queries.allAssistants();
  }

  async forStudent(studentId: string): Promise<AssistantView[]> {
    if (!(await this.queries.studentExists(studentId))) throw notFound('student_not_found');
    return this.queries.forStudent(studentId);
  }

  /** 404 student_not_found; 400 not_an_assistant when the login's role is not assistant. */
  async assign(input: { studentId: string; body: unknown; actorId: string }): Promise<AssistantView[]> {
    const { profileId } = parseOrThrow(assignAssistantSchema, input.body);
    if (!(await this.queries.studentExists(input.studentId))) throw notFound('student_not_found');
    if (!(await this.queries.isAssistant(profileId))) throw badRequest('not_an_assistant');
    await this.queries.assign({ studentId: input.studentId, profileId, actorId: input.actorId });
    return this.queries.forStudent(input.studentId);
  }

  async remove(studentId: string, profileId: string): Promise<AssistantView[]> {
    await this.queries.remove(studentId, profileId);
    return this.queries.forStudent(studentId);
  }

  /** GET /assistants/me/lessons: only the lessons of the caller's own assigned students. */
  async mine(input: { profileId: string; query: unknown }): Promise<AssistantLessonView[]> {
    const range = parseOrThrow(rangeSchema, input.query);
    const refs = await this.queries.lessonRefs(await this.queries.studentIdsOf(input.profileId));
    return this.lessons.between(refs, range);
  }
}
