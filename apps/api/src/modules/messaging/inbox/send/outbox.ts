import type { TablesInsert } from '@ab/db';
import type { MessageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { MessageSender } from '../../whatsapp/sender/message.sender';
import { MessageViews } from '../../whatsapp/messages/message.views';
import { ThreadsQueries } from '../threads/threads.queries';

/** The row as the clients see it; `replayed` = a repeated request id, nothing new was queued. */
export type Sent = { view: MessageView; replayed: boolean };

type Outbound = Omit<TablesInsert<'messages'>, 'direction' | 'status'>;

/**
 * Queue the row (rule 8: a replayed dedup_key returns the first row, nothing new is queued) and kick
 * the sender. Gate closed → the pass sends nothing and the row stays `queued` with no error.
 *   send()   answers with the row as it is after one whole sender pass (≤ 50 rows): callers that
 *            report the outcome (the feedback request, «ابعت لينك الحلقة»: message_status).
 *   queue()  the inbox's text, template and file sends (owner 2026-10-27 «instant send»): answers as
 *            soon as the row is queued; the pass runs in the background and the chat's next refresh
 *            shows sent / failed. Duplicate-send safety is the same dedup_key as send().
 */
@Injectable()
export class Outbox {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly sender: MessageSender,
    private readonly views: MessageViews,
  ) {}

  send(row: Outbound): Promise<Sent> {
    return this.write(row, true);
  }

  queue(row: Outbound): Promise<Sent> {
    return this.write(row, false);
  }

  private async write(row: Outbound, wait: boolean): Promise<Sent> {
    const queued = await this.queries.enqueue({ ...row, direction: 'outbound', status: 'queued' });
    if (queued.status === 'queued') {
      // kick() never rejects (runOnce catches and logs); queue() never waits on WhatsApp.
      const pass = this.sender.kick();
      if (wait) await pass;
    }
    const view = await this.views.view((await this.queries.get(queued.id)) ?? queued);
    return { view, replayed: queued.replayed === true };
  }
}
