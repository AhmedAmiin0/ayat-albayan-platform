import type { MessageView } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageSender } from '../sender/message.sender';
import { MessageViews } from './message.views';
import { needsManualSend, type MessageRow } from './message.mapper';
import { MessagesQueries } from './messages.queries';
import { AUTO_OFF } from '../sender/send-stale';
import { waHttpError } from '../templates/catalog/template.mapper';

export interface MessageChange {
  before: MessageRow;
  view: MessageView;
}

/** M1 retry, M2 sent-manually, M3 hand-off (R-MSG-03, docs/12 §4); the controller audits them. */
@Injectable()
export class MessagesService {
  constructor(
    private readonly queries: MessagesQueries,
    private readonly views: MessageViews,
    private readonly sender: MessageSender,
  ) {}

  /**
   * Only a failed row goes back to the queue (attempts 0, error cleared); the sender runs now.
   * A held row (auto_off) while automatic messages are still OFF: 409 auto_off, it would be held again.
   */
  async retry(id: string, opts: { automaticOn: boolean }): Promise<MessageChange> {
    const before = await this.row(id);
    const notRetryable = () => waHttpError('not_retryable', 409, { status: before.status });
    // A calls-number row (docs/28 §10) is never queued: staff tap «اطلب إذن الاتصال» again instead.
    if (before.status !== 'failed' || before.line === 'calls') throw notRetryable();
    if (before.error_code === AUTO_OFF.code && !opts.automaticOn) throw waHttpError(AUTO_OFF.code, 409);
    const after = await this.queries.requeue(id);
    if (!after) throw notRetryable();
    void this.sender.kick();
    return { before, view: await this.views.view(after) };
  }

  /** The admin sent it from their own WhatsApp (the wa.me link): never sent again. */
  async sentManually(id: string): Promise<MessageChange> {
    const before = await this.row(id);
    const notManual = () => waHttpError('not_manual', 409, { status: before.status });
    if (!needsManualSend(before)) throw notManual();
    const after = await this.queries.markSentManually(id, new Date());
    if (!after) throw notManual();
    return { before, view: await this.views.view(after) };
  }

  /**
   * The admin opened wa.me for it: the sender holds it until they confirm (M2) or undo (M1).
   * A sent file cannot ride along in wa.me: 409 media_handoff (retry stays allowed).
   */
  async handOff(id: string): Promise<MessageChange> {
    const before = await this.row(id);
    const notManual = () => waHttpError('not_manual', 409, { status: before.status });
    if (!needsManualSend(before)) throw notManual();
    if (before.media_path) throw waHttpError('media_handoff', 409);
    const after = await this.queries.handOff(id);
    if (!after) throw notManual();
    return { before, view: await this.views.view(after) };
  }

  private async row(id: string): Promise<MessageRow> {
    const row = await this.queries.get(id);
    if (!row) throw new NotFoundException({ code: 'message_not_found', message: 'message_not_found' });
    return row;
  }
}
