import { Injectable } from '@nestjs/common';
import { relayDedupKey } from './relay.dedup';
import { relayError, relayFailure, sentWithoutId } from './relay.errors';
import { RelayKeys } from './relay.keys';
import { relayCrmBody, relayReadable } from './relay.kinds';
import { RelayLine, type RelayLineNow } from './relay.line';
import { RelayRepo, type RelayIds } from './relay.repo';
import type { RelayRequest } from './relay.schema';

// The script relay (docs/19 «script relay»): the old Apps Script → this API → the notifications
// line's crm driver → the CRM → Meta. The platform is only the pipe: no gate on automatic
// messages, no template translation; one messages row per message, shown in the chat with ticks.

/** What the script reads back: 201 {data:{message_id, whatsapp_message_id}}. */
export interface RelaySent {
  message_id: string;
  whatsapp_message_id: string | null;
}

const asSent = (ids: RelayIds): RelaySent => ({
  message_id: ids.id,
  whatsapp_message_id: ids.waMessageId,
});

const NOT_CRM = {
  status: 503,
  code: 'relay_unavailable',
  message: 'the notifications line is not on the crm driver',
};
const BAD_KEY = { status: 401, code: 'unauthorized', message: 'invalid or missing API key' };

@Injectable()
export class RelayService {
  private readonly keys = new RelayKeys();

  constructor(
    private readonly line: RelayLine,
    private readonly repo: RelayRepo,
  ) {}

  /** The line when the Bearer is a key of its CRM account (relay.keys.ts); else 503 / 401 / 502. */
  async authorize(header: string | undefined): Promise<RelayLineNow> {
    const line = this.line.current();
    if (!line) throw relayError(NOT_CRM);
    const ok = await this.keys.accepts(header, line).catch((e: unknown) => {
      throw relayError(relayFailure(e));
    });
    if (!ok) throw relayError(BAD_KEY);
    return line;
  }

  /** Row first (dedup), then the send; a retry in the window gets the first row back, unsent. */
  async send(line: RelayLineNow, req: RelayRequest, now: Date = new Date()): Promise<RelaySent> {
    const dedupKey = relayDedupKey(req, now);
    const row = await this.repo.insert({
      phone: req.to,
      body: relayReadable(req),
      dedupKey,
      numberId: line.numberId,
      now,
    });
    if (!row) return this.replay(dedupKey);
    try {
      const sent = await line.client.sendBody(relayCrmBody(req));
      return await this.stamp(row.id, sent.waMessageId, now);
    } catch (e) {
      return this.failed(row.id, e, now);
    }
  }

  private async replay(dedupKey: string): Promise<RelaySent> {
    const first = await this.repo.byDedupKey(dedupKey);
    if (!first)
      throw relayError({ status: 409, code: 'duplicate', message: 'duplicate message, try again' });
    return asSent(first);
  }

  private async stamp(id: string, waMessageId: string | null, at: Date): Promise<RelaySent> {
    await this.repo.sent({ id, waMessageId, at });
    return asSent({ id, waMessageId });
  }

  /** CRM 2xx without a wamid = sent (201); may have gone = kept, held; never sent = row goes. */
  private async failed(id: string, e: unknown, now: Date): Promise<RelaySent> {
    if (sentWithoutId(e)) return this.stamp(id, null, now);
    const failure = relayFailure(e);
    await (failure.maybe ? this.repo.uncertain({ id, text: failure.message }) : this.repo.drop(id));
    throw relayError(failure);
  }
}
