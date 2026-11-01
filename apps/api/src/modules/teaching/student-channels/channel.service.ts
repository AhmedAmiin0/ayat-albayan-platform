import { CHANNEL_NOT_OPEN, type ChannelMessageView, type ChannelPage, type ChannelUnread, type TeacherChannelRow } from '@ab/shared';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import type { ChannelActor } from './channel-access';
import { ChannelNotify } from './channel-notify';
import { ChannelPeopleQueries } from './channel-people.queries';
import { toMessageView, toPage, toTeacherRows, unreadRolesFor } from './channel.mapper';
import { ChannelQueries } from './channel.queries';
import { TeachersRepo } from '@/modules/people/teachers';

/** A participant's write on a closed channel (before the subscription or the teacher's assignment). */
const closed = (actor: ChannelActor): boolean => actor.mode === 'participant' && !actor.open;

/** The student channel (docs/31 §2) once ChannelAccess has resolved the caller. */
@Injectable()
export class ChannelService {
  private readonly log = new Logger(ChannelService.name);

  constructor(
    private readonly queries: ChannelQueries,
    private readonly people: ChannelPeopleQueries,
    private readonly notify: ChannelNotify,
  ) {}

  /**
   * A page, oldest first within it; a monitor's says read_only. Reading never marks anything read. Closed
   * for a participant: no messages at all (`open` false), the apps show the closed line.
   */
  async page(actor: ChannelActor, before?: string): Promise<ChannelPage> {
    const channelId = await this.queries.channelOf(actor.studentId);
    const [rows, [student]] = await Promise.all([closed(actor) ? [] : this.queries.page({ channelId, before }), this.people.students([actor.studentId])]);
    const names = await this.people.names(rows.flatMap((r) => (r.sender_profile_id ? [r.sender_profile_id] : [])));
    const ctx = { me: actor.profileId, names, readOnly: actor.mode === 'monitor', studentName: student?.name ?? '' };
    return toPage(rows, { ...ctx, open: actor.open, channelId });
  }

  /** 403 for a monitor (read-only in v1), 409 channel_not_open while closed; the push goes after the row is stored. */
  async post(actor: ChannelActor, body: string): Promise<ChannelMessageView> {
    if (actor.mode !== 'participant') throw new ForbiddenException();
    if (!actor.open) throw conflict(CHANNEL_NOT_OPEN);
    const channelId = await this.queries.channelOf(actor.studentId);
    const row = await this.queries.insert({ channel_id: channelId, sender_profile_id: actor.profileId, sender_role: actor.role, body });
    await this.queries.setReadMark({ channelId, profileId: actor.profileId, at: row.created_at });
    await this.notify.sent(actor, row).catch((e: unknown) => this.log.warn(`channel push failed: ${String(e)}`));
    const names = await this.people.names([actor.profileId]);
    return toMessageView(row, { me: actor.profileId, names });
  }

  /**
   * A participant has seen the thread up to `at` (the newest message shown; never later than now), so a
   * message that arrived after the screen read stays unread. 403 for a monitor.
   */
  async read(actor: ChannelActor, at?: string, now = new Date()): Promise<void> {
    if (actor.mode !== 'participant') throw new ForbiddenException();
    if (!actor.open) throw conflict(CHANNEL_NOT_OPEN);
    const upTo = at && Date.parse(at) < now.getTime() ? new Date(at).toISOString() : now.toISOString();
    await this.queries.setReadMark({ channelId: await this.queries.channelOf(actor.studentId), profileId: actor.profileId, at: upTo });
  }

  async unread(actor: ChannelActor): Promise<ChannelUnread> {
    if (closed(actor)) return { unread: 0 };
    const countRoles = unreadRolesFor(actor.mode === 'participant' ? actor.role : null);
    const [sum] = await this.queries.summaries({ profileId: actor.profileId, studentIds: [actor.studentId], countRoles });
    return { unread: sum?.unread ?? 0 };
  }
}

/** GET /teachers/me/channels: the teacher's current students, newest activity first. */
@Injectable()
export class TeacherChannelList {
  constructor(
    private readonly teachers: TeachersRepo,
    private readonly queries: ChannelQueries,
    private readonly people: ChannelPeopleQueries,
  ) {}

  async list(user: AuthUser): Promise<TeacherChannelRow[]> {
    const teacherId = await this.teachers.idByProfile(user.id);
    if (!teacherId) throw notFound('teacher_not_linked');
    const ids = await this.queries.teacherStudentIds(teacherId);
    const [students, summaries] = await Promise.all([this.people.students(ids), this.queries.summaries({ profileId: user.id, studentIds: ids, countRoles: unreadRolesFor('teacher') })]);
    return toTeacherRows(students, summaries);
  }
}
