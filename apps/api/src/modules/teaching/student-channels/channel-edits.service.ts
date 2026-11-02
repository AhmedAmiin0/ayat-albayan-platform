import { channelActions, type ChannelMessageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { conflict, forbidden, notFound } from '@/common/http/errors';
import type { ChannelActor } from './channel-access';
import { ChannelEditsRepo } from './channel-edits.repo';
import { ChannelPeopleRepo } from './channel-people.repo';
import { toMessageView } from './channel.mapper';
import { ChannelRepo, type ChannelMessageRow } from './channel.repo';

interface ChannelEditInput {
  actor: ChannelActor;
  messageId: string;
  /** The admin's route (moderation): deletes any message, never edits. */
  moderator?: boolean;
}

type Op = 'edit' | 'delete';

/**
 * «تعديل» / «حذف للجميع» in the student channel (owner 2026-10-30), every rule server-side: the
 * sender
 * edits their own text within 15 minutes and deletes their own message within 48 hours
 * (channelActions);
 * the admin deletes any. Errors: 404 message_not_found, 409 message_deleted, 403 not_your_message /
 * edit_window_closed / delete_window_closed. Each change is audited; the earlier text goes to the
 * history.
 */
@Injectable()
export class ChannelEdits {
  constructor(
    private readonly queries: ChannelRepo,
    private readonly repo: ChannelEditsRepo,
    private readonly people: ChannelPeopleRepo,
    private readonly audit: AuditService,
  ) {}

  async edit(
    input: ChannelEditInput & { body: string },
    now = new Date(),
  ): Promise<ChannelMessageView> {
    const row = await this.allowed(input, { op: 'edit', now });
    const change = {
      id: row.id,
      actor: input.actor.profileId,
      at: now.toISOString(),
      previous: row.body,
    };
    const saved = await this.repo.edit({ ...change, body: input.body });
    return this.done(input, { op: 'edit', saved });
  }

  async remove(input: ChannelEditInput, now = new Date()): Promise<ChannelMessageView> {
    const row = await this.allowed(input, { op: 'delete', now });
    const saved = await this.repo.remove({
      id: row.id,
      actor: input.actor.profileId,
      at: now.toISOString(),
      previous: row.body,
    });
    return this.done(input, { op: 'delete', saved });
  }

  /** The message of this student's channel, if this caller may change it now. */
  private async allowed(
    input: ChannelEditInput,
    ask: { op: Op; now: Date },
  ): Promise<ChannelMessageRow> {
    const moderator = input.moderator === true && ask.op === 'delete';
    if (input.actor.mode !== 'participant' && !moderator) throw forbidden('channel_read_only');
    const channelId = await this.queries.channelOf(input.actor.studentId);
    const row = await this.repo.message({ channelId, id: input.messageId });
    if (!row) throw notFound('message_not_found');
    if (row.deleted_at) throw conflict('message_deleted');
    const mine = row.sender_profile_id !== null && row.sender_profile_id === input.actor.profileId;
    if (!mine && !moderator) throw forbidden('not_your_message');
    const may = channelActions({
      message: { mine, created_at: row.created_at, deleted: false },
      moderator,
      now: ask.now,
    });
    if (!may[ask.op]) throw forbidden(`${ask.op}_window_closed`);
    return row;
  }

  private async done(input: ChannelEditInput, out: { op: Op; saved: ChannelMessageRow | null }) {
    if (!out.saved) throw conflict('message_deleted');
    const at = out.op === 'edit' ? out.saved.edited_at : out.saved.deleted_at;
    await this.audit.record({
      actorId: input.actor.profileId,
      entity: 'channel_messages',
      entityId: out.saved.id,
      action: out.op === 'edit' ? 'channel_message_edited' : 'channel_message_deleted',
      after: { at: at ?? null, moderator: input.moderator === true },
    });
    const sender = out.saved.sender_profile_id;
    const names = await this.people.names(sender ? [sender] : []);
    return toMessageView(out.saved, { me: input.actor.profileId, names });
  }
}
