import { FAMILY_CHAT_OFF, type ChannelSenderRole } from '@ab/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden, notFound } from '@/common/http/errors';
import { PortalScopes } from '@/modules/people/portal';
import { TeachersRepo } from '@/modules/people/teachers';
import { ChannelPeopleRepo } from './channel-people.repo';
import { ChannelRepo } from './channel.repo';
import { FamilyChatSettings } from './family-chat.settings';

/**
 * Who is in a channel and how: a participant writes and has read marks; a monitor only reads.
 * `open`: channel_is_open (subscribed and a teacher assigned); a closed one is
 * the participants' empty closed state (409 channel_not_open on a write) while a monitor still
 * reads.
 */
export type ChannelActor =
  | { mode: 'participant'; studentId: string; profileId: string; role: ChannelSenderRole; open: boolean }
  | { mode: 'monitor'; studentId: string; profileId: string; open: boolean };

/** ChannelAccess's people lookups and the family chat switch, grouped (max-params). */
@Injectable()
export class AccessDeps {
  constructor(
    @Inject(TeachersRepo) readonly teachers: TeachersRepo,
    @Inject(PortalScopes) readonly portal: PortalScopes,
    @Inject(FamilyChatSettings) readonly familyChat: FamilyChatSettings,
  ) {}
}

/**
 * docs/31 §2, rule 9 server-side. Participants: the student's current teacher(s)
 * (channel_teacher_ids), the guardian login of the student, and the student's own login, a
 * child's too (a child chats like any student), and the one assistant in the chat's seat (any
 * assistant may take it, one at a time). Monitors (read-only): anyone the route's
 * student_channels.monitor key let in. Another teacher, family or assistant is 404
 * student_not_found (as an unknown id). Every family path is 403 family_chat_off while
 * settings.family_chat_enabled is off (docs/50 §2).
 */
@Injectable()
export class ChannelAccess {
  constructor(
    @Inject(ChannelRepo) private readonly queries: ChannelRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(AccessDeps) private readonly deps: AccessDeps,
  ) {}

  async teacher(user: AuthUser, studentId: string): Promise<ChannelActor> {
    const teacherId = await this.deps.teachers.idByProfile(user.id);
    if (!teacherId) throw notFound('teacher_not_linked');
    if (!(await this.queries.teacherIds(studentId)).includes(teacherId)) throw notFound('student_not_found');
    return { mode: 'participant', studentId, profileId: user.id, role: 'teacher', open: await this.queries.isOpen(studentId) };
  }

  async family(user: AuthUser, studentId: string): Promise<ChannelActor> {
    await this.deps.portal.student(user, studentId);
    // After the scope: another family's id stays 404 whatever the switch (docs/50 §4).
    if (!(await this.deps.familyChat.enabled())) throw forbidden(FAMILY_CHAT_OFF);
    if (user.role !== 'guardian' && user.role !== 'student') throw new ForbiddenException();
    return { mode: 'participant', studentId, profileId: user.id, role: user.role, open: await this.queries.isOpen(studentId) };
  }

  /** student_channels.monitor (the route's key): any existing student. */
  async monitor(user: AuthUser, studentId: string): Promise<ChannelActor> {
    if ((await this.people.students([studentId])).length === 0) throw notFound('student_not_found');
    return { mode: 'monitor', studentId, profileId: user.id, open: await this.queries.isOpen(studentId) };
  }

  /**
   * The seat holder (ChannelPeopleRepo.assistantId; one per chat) reads the
   * chat; she writes as 'sales' only on an open channel while settings.family_chat_enabled is on
   * (she writes to the family), else her page is read-only (no composer). The seat is not sales
   * ownership: it grants no money, lead or commission scope.
   */
  async assistant(user: AuthUser, studentId: string): Promise<ChannelActor> {
    const seat = await this.seat(user, studentId);
    const writes = seat.open && (await this.deps.familyChat.enabled());
    return writes ? { ...seat, mode: 'participant', role: 'sales' } : { ...seat, mode: 'monitor' };
  }

  /**
   * Her send and read-mark routes: 403 family_chat_off while the family chat is off (as the
   * family's own routes), else a participant; a closed channel is then 409 channel_not_open.
   */
  async assistantWriter(user: AuthUser, studentId: string): Promise<ChannelActor> {
    const seat = await this.seat(user, studentId);
    if (!(await this.deps.familyChat.enabled())) throw forbidden(FAMILY_CHAT_OFF);
    return { ...seat, mode: 'participant', role: 'sales' };
  }

  private async seat(user: AuthUser, studentId: string) {
    if ((await this.people.assistantId(studentId)) !== user.id) throw notFound('student_not_found');
    return { studentId, profileId: user.id, open: await this.queries.isOpen(studentId) };
  }
}
