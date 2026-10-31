import { CHANNEL_GUARDIAN_ONLY, familyChats, type ChannelSenderRole } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden, notFound } from '@/common/http/errors';
import { PortalScopes } from '@/modules/people/portal';
import { TeachersRepo } from '@/modules/people/teachers';
import { ChannelPeopleQueries } from './channel-people.queries';
import { ChannelQueries } from './channel.queries';

/**
 * Who is in a channel and how: a participant writes and has read marks; a monitor only reads. `open`:
 * channel_is_open (owner 2026-10-29: subscribed and a teacher assigned); a closed one is the participants'
 * empty closed state (409 channel_not_open on a write) while a monitor still reads.
 */
export type ChannelActor =
  | { mode: 'participant'; studentId: string; profileId: string; role: ChannelSenderRole; open: boolean }
  | { mode: 'monitor'; studentId: string; profileId: string; open: boolean };

/** ChannelAccess's people lookups, grouped (max-params). */
@Injectable()
export class AccessDeps {
  constructor(
    readonly teachers: TeachersRepo,
    readonly portal: PortalScopes,
  ) {}
}

/**
 * docs/31 §2, rule 9 server-side. Participants: the student's current teacher(s) (channel_teacher_ids), the
 * guardian login of the student, and the student's own login only when the student is their own contact
 * (familyChats, owner 2026-10-29: a child's own login is 403 channel_guardian_only). Monitors (read-only): anyone
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
    return { mode: 'participant', studentId, profileId: user.id, role: 'teacher', open: await this.queries.isOpen(studentId) };
  }

  async family(user: AuthUser, studentId: string): Promise<ChannelActor> {
    const student = await this.deps.portal.student(user, studentId);
    if (user.role !== 'guardian' && user.role !== 'student') throw new ForbiddenException();
    if (!familyChats({ kind: user.role, contactIsSelf: student.contact_is_self })) throw forbidden(CHANNEL_GUARDIAN_ONLY);
    return { mode: 'participant', studentId, profileId: user.id, role: user.role, open: await this.queries.isOpen(studentId) };
  }

  /** student_channels.monitor (the route's key): any existing student. */
  async monitor(user: AuthUser, studentId: string): Promise<ChannelActor> {
    if ((await this.people.students([studentId])).length === 0) throw notFound('student_not_found');
    return { mode: 'monitor', studentId, profileId: user.id, open: await this.queries.isOpen(studentId) };
  }

  /** The owning assistant: her leads' families and the students she brought (ownershipOf). */
  async owner(user: AuthUser, studentId: string): Promise<ChannelActor> {
    if (!(await this.people.ownedStudentIds(user.id)).includes(studentId)) throw notFound('student_not_found');
    return { mode: 'monitor', studentId, profileId: user.id, open: await this.queries.isOpen(studentId) };
  }
}
