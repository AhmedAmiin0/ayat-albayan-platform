import { waIdToE164, type LessonRating, type PushKind } from '@ab/shared';
import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { PushService, type PushEvent } from '../../../../common/push/push.service';
import { OwnNumbers } from '../../numbers';
import type { InboundEvent } from '../webhook.events';
import { inboundPush, intentOf, ratingOf } from './webhook.inbound';
import { InboundStore, type Sender } from './webhook.inbound.store';
import type { Contact } from '../webhook.queries';
import { QuickReplies } from './webhook.quick-reply';
import { InboundReactions } from './webhook.reaction';

/** Time an undo (one DELETE) gets before the controller's 200 goes out. */
const UNDO_MARGIN_MS = 500;

interface InboundOptions {
  /** Epoch ms when Meta gets its 200 regardless (WebhookService); none = it waits for us. */
  deadline?: number;
  /**
   * A message the catch-up job back-filled (external/inbound, older than LATE_MS when stored): the
   * row, lead and quick reply as usual, its unread count included, but no admin / assistant push.
   * Its lead's follow-up cycle starts at `now` (the back-fill), never in the past (owner, 10-30).
   */
  quiet?: boolean;
  /** The catch-up run's time (a quiet message); defaults to the clock. */
  now?: Date;
}

/**
 * One inbound WhatsApp message (R-MSG-04, R-LEAD-01): lead upsert, the stored row, quick reply
 * (a lesson_rating tap is stored on lesson_feedback, migration 195), the admin push and the
 * assistants' push (docs/21 §6: the family's owners, else every assistant). Replay-safe: Meta re-sends a wamid until it gets a 200, and a wamid already
 * stored stops here before any side effect (no second confirm, no second push). If the quick
 * reply fails (DB down) while Meta still waits for our answer, the row just stored is removed and
 * the error goes up (500): Meta's re-send then finds no row and does it all again. Past the
 * deadline Meta already has its 200 and will not re-send, so the row stays (the message is in the
 * inbox; only the confirm / pause and the push are lost) and the error is only logged.
 * ponytail: a pending flag on the row + a sweeper would retry those too; add it if logs show any.
 * A reaction stops first: it only sets their_reaction (InboundReactions), no row, lead, reply or push.
 * The ONE gate for the academy's own numbers (owner 2026-10-27): a message from one of them is stored
 * (audit, already read) and nothing else runs: no lead, quick reply, rating or push.
 */
@Injectable()
export class InboundService {
  private readonly log = new Logger(InboundService.name);
  /** The academy's own numbers (property-injected: the constructor is at the 3-parameter limit). */
  @Optional() @Inject(OwnNumbers) private readonly own?: OwnNumbers;
  /** A reaction is a column of the message it names, never a row (migration 900). */
  @Optional() @Inject(InboundReactions) private readonly reactions?: InboundReactions;

  constructor(
    private readonly store: InboundStore,
    private readonly replies: QuickReplies,
    private readonly push: PushService,
  ) {}

  /** True when this call stored a new row (false: a replay, a reaction or not a phone). */
  async handle(m: InboundEvent, opts: InboundOptions = {}): Promise<boolean> {
    const phone = waIdToE164(m.from);
    if (!phone) {
      this.log.warn(`inbound ${m.waMessageId}: wa_id ${m.from} is not a phone`);
      return false;
    }
    if (m.type === 'reaction') {
      await this.reactions?.apply(m, phone);
      return false;
    }
    if (await this.own?.has(phone)) return this.store.saveOwn(m, phone);
    const cycle = opts.quiet ? (opts.now ?? new Date()) : m.at;
    const { who, lead } = await this.store.sender({ m, phone, at: cycle });
    const intent = intentOf(m);
    const rating = ratingOf(m);
    const asks = rating !== null || intent === 'confirm' || intent === 'reschedule';
    const lessonId = asks ? await this.replies.lessonFor({ m, phone, who, rating: rating !== null }) : null;
    const stored = await this.store.save({ m, phone, who, leadId: lead.id, lessonId, stage: lead.stage });
    if (!stored) return false; // replay of a wamid we already handled
    try {
      await this.replies.act({ intent, m, lessonId, leadId: lead.id });
      await this.rate({ m, who, rating, lessonId });
    } catch (e) {
      await this.undo(m.waMessageId, opts.deadline);
      throw e;
    }
    if (opts.quiet) return true;
    const { kind, event } = inboundPush({ m, phone, who, newLeadId: lead.created, intent });
    await this.push.notifyAdmins(kind, event);
    await this.notifySalesFor(kind, event, { who, lead });
    return true;
  }

  /** The assistants' alert (docs/21 §6): none for a teacher; a new lead → every assistant. */
  private async notifySalesFor(kind: PushKind, event: PushEvent, from: Sender): Promise<void> {
    if (from.who.teacher) return;
    let owners: string[];
    try {
      owners = kind === 'new_lead' ? [] : await this.store.owners(from.who, from.lead);
    } catch (e) {
      return void this.log.warn(`inbound ${event.subject}: owners lookup failed, no sales push: ${e instanceof Error ? e.message : String(e)}`);
    }
    await this.push.notifySales(kind, event, owners);
  }

  /** A lesson_rating tap of a guardian on a lesson of theirs → lesson_feedback (migration 195). */
  private async rate(input: { m: InboundEvent; who: Contact; rating: LessonRating | null; lessonId: string | null }): Promise<void> {
    const { m, who, rating, lessonId } = input;
    if (!rating || !lessonId || !who.guardian) return;
    await this.store.rate({ lessonId, guardianId: who.guardian.id, rating, waMessageId: m.waMessageId, at: m.at });
  }

  /** Unstores the row so Meta's re-send runs the reply again, only while Meta still waits. */
  private async undo(waMessageId: string, deadline: number | undefined): Promise<void> {
    if (deadline !== undefined && Date.now() > deadline - UNDO_MARGIN_MS) {
      return void this.log.error(`inbound ${waMessageId}: quick reply failed after the 200; row kept`);
    }
    try {
      await this.store.forget(waMessageId);
    } catch (e) {
      this.log.error(`inbound ${waMessageId}: could not unstore: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
