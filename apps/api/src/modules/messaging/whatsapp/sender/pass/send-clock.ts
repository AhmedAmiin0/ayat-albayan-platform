import type { WaLine } from '@ab/shared';
import { Logger } from '@nestjs/common';
import { connectionsOpened } from '@/common/infra/http/connections';
import type { SendOutcome } from '@/modules/messaging/whatsapp/sender/message.job';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';
import { sendKind, sendLine } from './send-log';

const log = new Logger('MessageWorker');
const ms = (from: number): number => Math.round(performance.now() - from);

/**
 * One claimed row's timing (docs/42 42-2): the provider call, the «sent» write, then one `wa_send`
 * line with the outcome. `docker compose logs ayat-worker | grep wa_send` reads them.
 */
export class SendClock {
  private provider_ms = 0;
  private record_ms: number | null = null;
  private new_conns = 0;
  private queue_ms: number | null = null;

  constructor(private readonly at: { row: DueMessage; line: WaLine }) {}

  async provider<T>(call: () => Promise<T>): Promise<T> {
    const { created_at } = this.at.row;
    this.queue_ms = created_at ? Math.max(0, Date.now() - Date.parse(created_at)) : null;
    const conns = connectionsOpened();
    const started = performance.now();
    try {
      return await call();
    } finally {
      this.provider_ms = ms(started);
      this.new_conns = connectionsOpened() - conns;
    }
  }

  async record<T>(call: () => Promise<T>): Promise<T> {
    const started = performance.now();
    try {
      return await call();
    } finally {
      this.record_ms = ms(started);
    }
  }

  /** Logs the line and hands the outcome back. */
  end(outcome: SendOutcome): SendOutcome {
    const { row, line } = this.at;
    log.log(sendLine({
      id: row.id, line, kind: sendKind(row), queue_ms: this.queue_ms, provider_ms: this.provider_ms,
      record_ms: this.record_ms, outcome, new_conns: this.new_conns,
    }));
    return outcome;
  }
}
