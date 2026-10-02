import type { MessageView } from '@ab/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageSender } from './message.sender';
import { MessageViews } from './message.views';
import { needsManualSend, type MessageRow } from './message.mapper';
import { MessagesQueries } from './messages.queries';
import { waHttpError } from './template.mapper';

export interface MessageChange {
  before: MessageRow;
  view: MessageView;
}

/** M1 retry and M2 sent-manually (R-MSG-03, docs/12 §4). The controller audits both. */
@Injectable()
export class MessagesService {
  constructor(
    private readonly queries: MessagesQueries,
    private readonly views: MessageViews,
    private readonly sender: MessageSender,
  ) {}

  /** Only a failed row goes back to the queue (attempts 0, error cleared); the sender runs now. */
  async retry(id: string): Promise<MessageChange> {
    const before = await this.row(id);
    const notRetryable = () => waHttpError('not_retryable', 409, { status: before.status });
    if (before.status !== 'failed') throw notRetryable();
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

  private async row(id: string): Promise<MessageRow> {
    const row = await this.queries.get(id);
    if (!row) throw new NotFoundException({ code: 'message_not_found', message: 'message_not_found' });
    return row;
  }
}
