import { CHANNEL_NOT_OPEN, type ChannelMessageView, type ChannelPost } from '@ab/shared';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import type { ChannelActor } from '@/modules/teaching/student-channels/channel-access';
import { ChannelNotify } from '@/modules/teaching/student-channels/channel-notify';
import { ChannelRepo, type ChannelMessageRow } from '@/modules/teaching/student-channels/channel.repo';
import type { ChannelViewer } from '@/modules/teaching/student-channels/reads/channel-read-state';
import { ChannelViews } from '@/modules/teaching/student-channels/views/channel-views.service';
import { toMessageView } from '@/modules/teaching/student-channels/views/message-view';
import { ChannelSendInputs } from './channel-send-inputs';

type Participant = Extract<ChannelActor, { mode: 'participant' }>;

/**
 * POST …/messages (docs/31 §2): 403 for a monitor, 409 channel_not_open while closed. Once the
 * row is stored the send has happened: the sender's read mark, the pushes and the names are
 * best-effort (a failure logs, never a 500). A resend with the same client_id answers the stored
 * message and pushes nothing again.
 */
@Injectable()
export class ChannelSender {
  private readonly log = new Logger(ChannelSender.name);

  constructor(
    @Inject(ChannelRepo) private readonly queries: ChannelRepo,
    @Inject(ChannelSendInputs) private readonly inputs: ChannelSendInputs,
    @Inject(ChannelNotify) private readonly notify: ChannelNotify,
    @Inject(ChannelViews) private readonly views: ChannelViews,
  ) {}

  async post(actor: ChannelActor, post: ChannelPost): Promise<ChannelMessageView> {
    if (actor.mode !== 'participant') throw new ForbiddenException();
    if (!actor.open) throw conflict(CHANNEL_NOT_OPEN);
    const channelId = await this.queries.channelOf(actor.studentId);
    const extra = await this.inputs.columns(channelId, post);
    const { row, created } = await this.queries.insert({
      ...{ channel_id: channelId, sender_profile_id: actor.profileId, sender_role: actor.role },
      ...{ body: post.body, ...extra },
      ...(post.client_id ? { client_id: post.client_id } : {}),
    });
    const viewer = { profileId: actor.profileId, studentId: actor.studentId, channelId };
    if (created) await this.after(actor, { viewer, row });
    return toMessageView(row, await this.views.safeContext(row, viewer));
  }

  private async after(actor: Participant, sent: { viewer: ChannelViewer; row: ChannelMessageRow }) {
    const { viewer, row } = sent;
    const mark = { channelId: viewer.channelId, profileId: viewer.profileId, at: row.created_at };
    await this.queries.setReadMark(mark).catch((e: unknown) => this.warn('read mark', e));
    await this.notify.sent(actor, row).catch((e: unknown) => this.warn('push', e));
  }

  private warn(what: string, e: unknown): void {
    this.log.warn(`channel ${what} failed: ${String(e)}`);
  }
}
