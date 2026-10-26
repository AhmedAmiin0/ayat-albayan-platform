import type { ChannelMessageView, ChannelPage, ChannelUnread, TeacherChannelRow } from '@ab/shared';
import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { AuthUser } from '../../../common/auth/verify-token';
import { notFound } from '../../../common/http/errors';
import type { ChannelActor } from './channel-access';
import { ChannelNotify } from './channel-notify';
import { ChannelPeopleQueries } from './channel-people.queries';
import { toMessageView, toPage, toTeacherRows } from './channel.mapper';
import { ChannelQueries } from './channel.queries';
import { TeachersQueries } from '../../people/teachers';

/** The student channel (docs/31 §2) once ChannelAccess has resolved the caller. */
@Injectable()
export class ChannelService {
  private readonly log = new Logger(ChannelService.name);

  constructor(
    private readonly queries: ChannelQueries,
    private readonly people: ChannelPeopleQueries,
    private readonly notify: ChannelNotify,
  ) {}

  /** A page, oldest first within it; a monitor's says read_only. Reading never marks anything read. */
  async page(actor: ChannelActor, before?: string): Promise<ChannelPage> {
    const channelId = await this.queries.channelOf(actor.studentId);
    const rows = await this.queries.page({ channelId, before });
    const names = await this.people.names(rows.flatMap((r) => (r.sender_profile_id ? [r.sender_profile_id] : [])));
    return toPage(rows, { me: actor.profileId, names, readOnly: actor.mode === 'monitor' });
  }

  /** 403 for a monitor (read-only in v1); the push goes after the row is stored. */
  async post(actor: ChannelActor, body: string): Promise<ChannelMessageView> {
    if (actor.mode !== 'participant') throw new ForbiddenException();
    const channelId = await this.queries.channelOf(actor.studentId);
    const row = await this.queries.insert({ channel_id: channelId, sender_profile_id: actor.profileId, sender_role: actor.role, body });
    await this.queries.markRead({ channelId, profileId: actor.profileId, at: row.created_at });
    await this.notify.sent(actor, row).catch((e: unknown) => this.log.warn(`channel push failed: ${String(e)}`));
    const names = await this.people.names([actor.profileId]);
    return toMessageView(row, { me: actor.profileId, names });
  }

  /** A participant has seen the thread; 403 for a monitor (their reading changes nobody's count). */
  async read(actor: ChannelActor, now = new Date()): Promise<void> {
    if (actor.mode !== 'participant') throw new ForbiddenException();
    await this.queries.markRead({ channelId: await this.queries.channelOf(actor.studentId), profileId: actor.profileId, at: now.toISOString() });
  }

  async unread(actor: ChannelActor): Promise<ChannelUnread> {
    const [sum] = await this.queries.summaries({ profileId: actor.profileId, studentIds: [actor.studentId] });
    return { unread: sum?.unread ?? 0 };
  }
}

/** GET /teachers/me/channels: the teacher's current students, newest activity first. */
@Injectable()
export class TeacherChannelList {
  constructor(
    private readonly teachers: TeachersQueries,
    private readonly queries: ChannelQueries,
    private readonly people: ChannelPeopleQueries,
  ) {}

  async list(user: AuthUser): Promise<TeacherChannelRow[]> {
    const teacherId = await this.teachers.idByProfile(user.id);
    if (!teacherId) throw notFound('teacher_not_linked');
    const ids = await this.queries.teacherStudentIds(teacherId);
    const [students, summaries] = await Promise.all([this.people.students(ids), this.queries.summaries({ profileId: user.id, studentIds: ids })]);
    return toTeacherRows(students, summaries);
  }
}
