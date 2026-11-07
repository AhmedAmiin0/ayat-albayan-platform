import type { TablesInsert } from '@ab/db';
import type { MessageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { sleep } from '@/common/infra/cache/sleep';
import { appRole } from '@/config/role/app-role';
import { MessageSender } from '@/modules/messaging/whatsapp/sender/message.sender';
import { laneOfRow } from '@/modules/messaging/whatsapp';
import { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import { ThreadMessagesRepo } from '@/modules/messaging/inbox/threads/store';

/**
 * The row as the clients see it; `replayed` = a repeated request id, nothing new was queued;
 * `sameRequest` (a correction's replay only) = that first row IS this request (round 4 of #694).
 */
export type Sent = { view: MessageView; replayed: boolean; sameRequest?: boolean };

type Outbound = Omit<TablesInsert<'messages'>, 'direction' | 'status'>;

/** send() on an API copy: how often and how many times the row is read again while it is still queued. */
export const SETTLE_POLL_MS = 500;
export const SETTLE_POLLS = 10;

/**
 * Queue the row (rule 8: a replayed dedup_key returns the first row, nothing new is queued) and kick
 * the sender. Gate closed → the pass sends nothing and the row stays `queued` with no error.
 *   send()   answers with the row as it is after one whole sender pass (≤ 50 rows): callers that
 *            report the outcome (the feedback request, «ابعت لينك الحلقة»: message_status). On an API
 *            copy (docs/09) the pass runs on the worker and its kick may time out (30 s, a busy
 *            worker): a row still queued is read again for at most SETTLE_POLLS × SETTLE_POLL_MS
 *            (5 s); after that the answer is `queued` and the worker's own poll sends it.
 *   queue()  the inbox's text, template and file sends (owner 2026-10-27 «instant send»): answers as
 *            soon as the row is queued; the pass runs in the background and the chat's next refresh
 *            shows sent / failed. Duplicate-send safety is the same dedup_key as send().
 */
@Injectable()
export class Outbox {
  constructor(
    private readonly queries: ThreadMessagesRepo,
    private readonly sender: MessageSender,
    private readonly views: MessageViews,
  ) {}

  send(row: Outbound): Promise<Sent> {
    return this.write(row, true);
  }

  queue(row: Outbound): Promise<Sent> {
    return this.write(row, false);
  }

  /** Rule 8 before a send's own checks: the row this key already queued (replayed), else null. */
  async replayOf(key: string): Promise<Sent | null> {
    const row = await this.queries.byDedupKey(key);
    return row ? { view: await this.views.view(row), replayed: true } : null;
  }

  private async write(row: Outbound, wait: boolean): Promise<Sent> {
    const queued = await this.queries.enqueue({ ...row, direction: 'outbound', status: 'queued' });
    if (queued.status === 'queued') {
      // kick() never rejects (runOnce catches and logs); queue() never waits on WhatsApp. It names
      // the row's lane (a chat text never waits behind notifications) and, for send(), asks the
      // worker to answer after the pass (docs/42 42-7, 42-8).
      const pass = this.sender.kick({ lane: laneOfRow(queued), wait });
      if (wait) await pass;
    }
    // The enqueue's own row (a replay's is read back there): only send() reads it again.
    const now = wait && queued.status === 'queued' ? await this.settled(queued.id) : queued;
    const view = await this.views.view(now ?? queued);
    return { view, replayed: queued.replayed === true };
  }

  /** The row after the pass; on an API copy, read again (bounded) while the worker has not moved it yet. */
  private async settled(id: string): Promise<Awaited<ReturnType<ThreadMessagesRepo['get']>>> {
    let row = await this.queries.get(id);
    for (let i = 0; i < SETTLE_POLLS && row?.status === 'queued' && appRole() === 'api'; i += 1) {
      await sleep(SETTLE_POLL_MS);
      row = await this.queries.get(id);
    }
    return row;
  }
}
