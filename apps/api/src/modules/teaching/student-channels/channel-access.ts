import type { ChannelSenderRole } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { notFound } from '../../../common/http/errors';
import { PortalScopes } from '../../people/portal';
import { TeachersQueries } from '../../people/teachers';
import { ChannelPeopleQueries } from './channel-people.queries';
import { ChannelQueries } from './channel.queries';

/** Who is in a channel and how: a participant writes and has read marks; a monitor only reads. */
export type ChannelActor =
  | { mode: 'participant'; studentId: string; profileId: string; role: ChannelSenderRole }
  | { mode: 'monitor'; studentId: string; profileId: string };

/** ChannelAccess's people lookups, grouped (max-params). */
@Injectable()
export class AccessDeps {
  constructor(
    readonly teachers: TeachersQueries,
    readonly portal: PortalScopes,
  ) {}
}

/**
 * docs/31 §2, rule 9 server-side. Participants: the student's current teacher(s) (channel_teacher_ids), the
 * guardian login of the student and the student's own login (PortalScopes). Monitors (read-only): anyone
 * the route's student_channels.monitor key let in, and the owning assistant (sales ownership). Another
 * teacher, family or assistant is 404 student_not_found (as an unknown id).
 */
@Injectable()
export class ChannelAccess {
  constructor(
    private readonly queries: ChannelQueries,
    private readonly people: ChannelPeopleQueries,
    private readonly deps: AccessDeps,
  ) {}

  async teacher(user: AuthUser, studentId: string): Promise<ChannelActor> {
    const teacherId = await this.deps.teachers.idByProfile(user.id);
    if (!teacherId) throw notFound('teacher_not_linked');
    if (!(await this.queries.teacherIds(studentId)).includes(teacherId)) throw notFound('student_not_found');
    return { mode: 'participant', studentId, profileId: user.id, role: 'teacher' };
  }

  async family(user: AuthUser, studentId: string): Promise<ChannelActor> {
    await this.deps.portal.student(user, studentId);
    if (user.role !== 'guardian' && user.role !== 'student') throw new ForbiddenException();
    return { mode: 'participant', studentId, profileId: user.id, role: user.role };
  }

  /** student_channels.monitor (the route's key): any existing student. */
  async monitor(user: AuthUser, studentId: string): Promise<ChannelActor> {
    if ((await this.people.students([studentId])).length === 0) throw notFound('student_not_found');
    return { mode: 'monitor', studentId, profileId: user.id };
  }

  /** The owning assistant: her leads' families and the students she brought (ownershipOf). */
  async owner(user: AuthUser, studentId: string): Promise<ChannelActor> {
    if (!(await this.people.ownedStudentIds(user.id)).includes(studentId)) throw notFound('student_not_found');
    return { mode: 'monitor', studentId, profileId: user.id };
  }
}
