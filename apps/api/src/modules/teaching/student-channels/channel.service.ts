import {
  CHANNEL_NOT_OPEN,
  CHANNEL_PAGE_SIZE,
  micros,
  type ChannelMessageView,
  type ChannelPage,
  type ChannelPost,
  type ChannelUnread,
  type TeacherChannelRow,
} from '@ab/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import type { ChannelActor } from './channel-access';
import { ChannelPeopleRepo } from './channel-people.repo';
import { toPage, toTeacherRows, UNREAD_COUNT_ROLES } from './channel.mapper';
import { ChannelRepo } from './channel.repo';
import { TeachersRepo } from '@/modules/people/teachers';
import { ChannelSender } from '@/modules/teaching/student-channels/send/channel-sender';
import { ChannelViews } from '@/modules/teaching/student-channels/views/channel-views.service';

/** A participant's write on a closed channel (before the subscription or the assignment). */
const closed = (actor: ChannelActor): boolean => actor.mode === 'participant' && !actor.open;

/** The student channel (docs/31 §2) once ChannelAccess has resolved the caller. */
@Injectable()
export class ChannelService {
  constructor(
    @Inject(ChannelRepo) private readonly queries: ChannelRepo,
    @Inject(ChannelPeopleRepo) private readonly people: ChannelPeopleRepo,
    @Inject(ChannelSender) private readonly sender: ChannelSender,
    @Inject(ChannelViews) private readonly views: ChannelViews,
  ) {}

  /**
   * A page, oldest first within it; a monitor's says read_only. Reading never marks anything read.
   * Closed for a participant: no messages at all (`open` false) and why (`closed_reason`), the apps
   * show its line.
   */
  async page(actor: ChannelActor, before?: string): Promise<ChannelPage> {
    const channelId = await this.queries.channelOf(actor.studentId);
    const [rows, [student], closedReason] = await Promise.all([
      closed(actor) ? [] : this.queries.page({ channelId, before }),
      this.people.students([actor.studentId]),
      actor.open ? null : this.queries.closedReason(actor.studentId),
    ]);
    const shown = rows.slice(0, CHANNEL_PAGE_SIZE);
    const viewer = { profileId: actor.profileId, studentId: actor.studentId, channelId };
    const ctx = await this.views.page(shown, viewer);
    const readOnly = actor.mode === 'monitor';
    const page = { readOnly, studentName: student?.name ?? '', closedReason, channelId };
    return toPage(rows, { ...ctx, ...page, open: actor.open });
  }

  /** Text, a file or both, maybe a reply (ChannelSender). */
  post(actor: ChannelActor, post: ChannelPost): Promise<ChannelMessageView> {
    return this.sender.post(actor, post);
  }

  /**
   * A participant has seen the thread up to `at` (the newest message shown, kept to the
   * microsecond; never later than now), so a message that arrived after the screen read stays
   * unread. The mark never moves back (channel_mark_read). 403 for a monitor.
   */
  async read(actor: ChannelActor, at?: string, now = new Date()): Promise<void> {
    if (actor.mode !== 'participant') throw new ForbiddenException();
    if (!actor.open) throw conflict(CHANNEL_NOT_OPEN);
    const nowIso = now.toISOString();
    const upTo = at && micros(at) < micros(nowIso) ? at : nowIso;
    const channelId = await this.queries.channelOf(actor.studentId);
    await this.queries.setReadMark({ channelId, profileId: actor.profileId, at: upTo });
  }

  /** A participant's unread on an open channel (a monitor never marks anything read: none). */
  async unread(actor: ChannelActor): Promise<ChannelUnread> {
    if (actor.mode !== 'participant' || !actor.open) return { unread: 0 };
    const countRoles = UNREAD_COUNT_ROLES;
    const [sum] = await this.queries.summaries({
      profileId: actor.profileId,
      studentIds: [actor.studentId],
      countRoles,
    });
    return { unread: sum?.unread ?? 0 };
  }
}

/** GET /teachers/me/channels: the teacher's current students, newest activity first. */
@Injectable()
export class TeacherChannelList {
  constructor(
    private readonly teachers: TeachersRepo,
    private readonly queries: ChannelRepo,
    private readonly people: ChannelPeopleRepo,
  ) {}

  async list(user: AuthUser): Promise<TeacherChannelRow[]> {
    const teacherId = await this.teachers.idByProfile(user.id);
    if (!teacherId) throw notFound('teacher_not_linked');
    const ids = await this.queries.teacherStudentIds(teacherId);
    const counts = { profileId: user.id, studentIds: ids, countRoles: UNREAD_COUNT_ROLES };
    const [students, summaries] = await Promise.all([
      this.people.students(ids),
      this.queries.summaries(counts),
    ]);
    return toTeacherRows(students, summaries);
  }
}
