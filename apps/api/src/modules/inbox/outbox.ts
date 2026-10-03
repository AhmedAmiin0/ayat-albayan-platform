import type { TablesInsert } from '@ab/db';
import type { MessageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { MessageSender } from '../whatsapp/message.sender';
import { MessageViews } from '../whatsapp/message.views';
import { ThreadsQueries } from './threads.queries';

/** The row as the clients see it; `replayed` = a repeated request id, nothing new was queued. */
export type Sent = { view: MessageView; replayed: boolean };

/**
 * H3/H4 «send now» (docs/12 §4): queue the row, run the sender, answer with the row as it is
 * after that pass. Gate closed → the pass sends nothing and the row comes back `queued` with no
 * error (the clients' inbox.messagingOff). A failed send comes back `failed` with Meta's code.
 * ponytail: the request waits for one whole sender pass (≤ 50 rows); fine for an admin inbox.
 */
@Injectable()
export class Outbox {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly sender: MessageSender,
    private readonly views: MessageViews,
  ) {}

  async send(row: Omit<TablesInsert<'messages'>, 'direction' | 'status'>): Promise<Sent> {
    const queued = await this.queries.enqueue({ ...row, direction: 'outbound', status: 'queued' });
    if (queued.status === 'queued') await this.sender.kick();
    const view = await this.views.view((await this.queries.get(queued.id)) ?? queued);
    return { view, replayed: queued.replayed === true };
  }
}
