import type { ReactionResult, ThreadReaction } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { MessageViews, waHttpError } from '../../whatsapp';
import { Outbox, type Sent } from '../send/outbox';
import { dedupKey, outboundBase, sendLine, type ThreadSend } from '../send/thread-send.service';
import { assertCanSend } from '../teacher-threads/teacher-scope';
import { sameNumber } from '../threads/thread-quotes';
import { ThreadsQueries } from '../threads/threads.queries';
import { sendsOnCrm } from './reaction-line';
import { assertReactable, reactionPayload, ReactionQueries } from './reaction.queries';

/** PUT /threads/:phone/messages/:id/reaction: the text send's ThreadSend plus the reacted message. */
export type ReactionRequest = ThreadSend<ThreadReaction> & { messageId: string };

/** Rule 8: message id + emoji + who + phone + request id, so a retry is one send and a new tap is a new one. */
export const reactionKey = (r: ReactionRequest): string => `reaction:${r.messageId}:${r.input.emoji ?? '-'}:${dedupKey(r)}`;

/**
 * A reaction (owner 2026-10-27), guarded exactly like a text in that chat: the caller's role and scope
 * (a teacher: own families only, never their own chat), the 24 h window and the chat's send line
 * (sendLine), the target in THIS chat with a wamid and ≤ 30 days old. Not a template, so the
 * restricted-templates rule does not apply. The CRM line has no reaction call: 409 reaction_unsupported.
 * our_reaction is set at once; ONE idempotent row goes through the outbox (the sender's own pass):
 * a failed send puts ours back (migration 900's trigger) and comes back as `failed` with its code.
 */
@Injectable()
export class ThreadReactionService {
  /** The reacted message's view (property-injected: the constructor is at the 3-parameter limit). */
  @Inject(MessageViews) private readonly views?: MessageViews;

  constructor(
    private readonly reactions: ReactionQueries,
    private readonly threads: ThreadsQueries,
    private readonly outbox: Outbox,
  ) {}

  async react(r: ReactionRequest, now = new Date()): Promise<{ result: ReactionResult; sent: Sent }> {
    if (r.scope) assertCanSend(r.scope, r.phone);
    const key = reactionKey(r);
    const target = await this.reactions.target(r.phone, r.messageId);
    assertReactable(target, now);
    const thread = await this.threads.thread(r.phone);
    const from = await sendLine(thread, { now, windows: () => this.threads.numberWindows(r.phone) });
    if (sendsOnCrm(from)) throw waHttpError('reaction_unsupported', HttpStatus.CONFLICT);
    // Meta only knows a wamid on the number that sent or received it.
    if (!sameNumber(target, from)) throw waHttpError('reaction_other_number', HttpStatus.CONFLICT);
    const { emoji } = r.input;
    const where = { targetId: target.id, phone: r.phone };
    if (!(await this.reactions.queued(key))) {
      await this.reactions.setOurs({ ...where, ours: { emoji, by: r.actorId, at: now.toISOString() } });
      await this.reactions.supersede(where);
    }
    const row = { ...outboundBase(r, thread), dedup_key: key, body: emoji ?? '', interactive_payload: reactionPayload(target, emoji), ...from };
    const sent = await this.outbox.send(row).catch(async (e: unknown) => {
      // Nothing queued: ours goes back at once (no failed row would ever revert it).
      await this.reactions.setOurs({ ...where, ours: { emoji: target.our_reaction, by: target.our_reaction_by, at: target.our_reaction_at } });
      throw e;
    });
    return { result: await this.result(target.id, sent), sent };
  }

  private async result(targetId: string, sent: Sent): Promise<ReactionResult> {
    const row = await this.threads.get(targetId);
    if (!row || !this.views) throw new Error('reacted message read failed');
    const { status, error_code, error_text } = sent.view;
    return { message: await this.views.view(row), status, error_code, error_text };
  }
}
