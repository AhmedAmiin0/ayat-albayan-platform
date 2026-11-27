import type { AssistantDay, AssistantLessonView, AssistantView } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import { badRequest, notFound } from '@/common/http/errors';
import { AssistantLessonsRepo } from './assistants.lessons';
import { AssistantsRepo } from './assistants.repo';
import type { AssignInput } from './assistants.types';

/** The admin's assistants manager and the assistant's own list. An assistant never sees another's students. */
@Injectable()
export class AssistantsService {
  constructor(
    private readonly queries: AssistantsRepo,
    private readonly lessons: AssistantLessonsRepo,
  ) {}

  all(): Promise<AssistantView[]> {
    return this.queries.allAssistants();
  }

  async forStudent(studentId: string): Promise<AssistantView[]> {
    if (!(await this.queries.studentExists(studentId))) throw notFound('student_not_found');
    return this.queries.forStudent(studentId);
  }

  /** 404 student_not_found; 400 not_an_assistant when the login's role is not assistant. */
  async assign(input: AssignInput): Promise<AssistantView[]> {
    const { profileId } = input;
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
  async mine(input: { profileId: string; day: AssistantDay }): Promise<AssistantLessonView[]> {
    const refs = await this.queries.lessonRefs(await this.queries.studentIdsOf(input.profileId));
    return this.lessons.between(refs, input.day);
  }
}
