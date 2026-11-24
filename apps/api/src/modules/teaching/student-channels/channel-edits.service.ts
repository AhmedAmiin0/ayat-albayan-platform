import { CHANNEL_NOT_OPEN, channelActions, type ChannelMessageView } from '@ab/shared';
import { Inject, Injectable, type HttpException } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, forbidden, notFound } from '@/common/http/errors';
import type { ChannelActor } from './channel-access';
import { ChannelEditsRepo } from './channel-edits.repo';
import { ChannelRepo, type ChannelMessageRow } from './channel.repo';
import { ChannelBell } from '@/modules/teaching/student-channels/notify/channel-bell';
import { ChannelViews } from '@/modules/teaching/student-channels/views/channel-views.service';
import { toMessageView } from '@/modules/teaching/student-channels/views/message-view';

interface ChannelEditInput {
  actor: ChannelActor;
  messageId: string;
  /** The admin's route (moderation): deletes any message, never edits. */
  moderator?: boolean;
}

type Op = 'edit' | 'delete';

/** What follows a change: the audit trail and the recipients' bell rows (max-params). */
@Injectable()
export class ChannelEditsAfter {
  constructor(
    @Inject(AuditService) readonly audit: AuditService,
    @Inject(ChannelBell) readonly bell: ChannelBell,
  ) {}
}

/** Who may change nothing here: a monitor (read only), a closed channel's participant. */
function actorRefusal(actor: ChannelActor, moderator: boolean): HttpException | null {
  if (moderator) return null;
  const refusals: Record<ChannelActor['mode'], HttpException | null> = {
    monitor: forbidden('channel_read_only'),
    participant: actor.open ? null : conflict(CHANNEL_NOT_OPEN),
  };
  return refusals[actor.mode];
}

const isFile = (row: ChannelMessageRow): boolean => Boolean(row.kind && row.kind !== 'text');
const isMine = (row: ChannelMessageRow, profileId: string): boolean =>
  row.sender_profile_id !== null && row.sender_profile_id === profileId;

interface RowAsk {
  op: Op;
  now: Date;
  profileId: string;
  moderator: boolean;
}

/** The first rule this change of this message breaks, in the order the API always answered. */
function rowRefusal(row: ChannelMessageRow, ask: RowAsk): HttpException | null {
  const mine = isMine(row, ask.profileId);
  const message = { mine, created_at: row.created_at, deleted: false };
  const may = channelActions({ message, moderator: ask.moderator, now: ask.now });
  const rules: [boolean, () => HttpException][] = [
    [Boolean(row.deleted_at), () => conflict('message_deleted')],
    [!mine && !ask.moderator, () => forbidden('not_your_message')],
    [ask.op === 'edit' && isFile(row), () => forbidden('not_a_text_message')],
    [!may[ask.op], () => forbidden(`${ask.op}_window_closed`)],
  ];
  return rules.find(([broken]) => broken)?.[1]() ?? null;
}

/** Sender edits own text within 15 min, deletes within 48 h; admin deletes any; audited. */
@Injectable()
export class ChannelEdits {
  constructor(
    @Inject(ChannelRepo) private readonly queries: ChannelRepo,
    @Inject(ChannelEditsRepo) private readonly repo: ChannelEditsRepo,
    @Inject(ChannelViews) private readonly views: ChannelViews,
    @Inject(ChannelEditsAfter) private readonly after: ChannelEditsAfter,
  ) {}

  async edit(
    input: ChannelEditInput & { body: string },
    now = new Date(),
  ): Promise<ChannelMessageView> {
    const { row, channelId } = await this.allowed(input, { op: 'edit', now });
    const change = { id: row.id, actor: input.actor.profileId, at: now.toISOString() };
    const saved = await this.repo.edit({ ...change, previous: row.body, body: input.body });
    return this.done(input, { op: 'edit', saved, channelId });
  }

  async remove(input: ChannelEditInput, now = new Date()): Promise<ChannelMessageView> {
    const { row, channelId } = await this.allowed(input, { op: 'delete', now });
    const change = { id: row.id, actor: input.actor.profileId, at: now.toISOString() };
    const saved = await this.repo.remove({ ...change, previous: row.body });
    return this.done(input, { op: 'delete', saved, channelId });
  }

  /** The message of this student's channel, if this caller may change it now. */
  private async allowed(input: ChannelEditInput, ask: { op: Op; now: Date }) {
    const moderator = input.moderator === true && ask.op === 'delete';
    const refusal = actorRefusal(input.actor, moderator);
    if (refusal) throw refusal;
    const channelId = await this.queries.channelOf(input.actor.studentId);
    const row = await this.repo.message({ channelId, id: input.messageId });
    if (!row) throw notFound('message_not_found');
    const no = rowRefusal(row, { ...ask, profileId: input.actor.profileId, moderator });
    if (no) throw no;
    return { row, channelId };
  }

  private async done(
    input: ChannelEditInput,
    out: { op: Op; saved: ChannelMessageRow | null; channelId: string },
  ): Promise<ChannelMessageView> {
    const { saved, channelId } = out;
    if (!saved) throw conflict('message_deleted');
    const at = out.op === 'edit' ? saved.edited_at : saved.deleted_at;
    await this.after.audit.record({
      actorId: input.actor.profileId,
      entity: 'channel_messages',
      entityId: saved.id,
      action: out.op === 'edit' ? 'channel_message_edited' : 'channel_message_deleted',
      after: { at: at ?? null, moderator: input.moderator === true },
    });
    await this.after.bell.changed(saved);
    const { profileId, studentId } = input.actor;
    const viewer = { profileId, studentId, channelId };
    return toMessageView(saved, await this.views.safeContext(saved, viewer));
  }
}
