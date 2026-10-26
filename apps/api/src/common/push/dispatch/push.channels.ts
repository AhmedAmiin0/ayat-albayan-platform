import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../../db/db.module';
import { expoDeliver, type PushTransport } from '../expo/expo-deliver';
import type { PushText } from '../expo/expo-push';
import { WebPushSender, type WebPushPayload } from '../web/web-push.sender';

export const PUSH_TRANSPORT = Symbol('PUSH_TRANSPORT');

/** One new bell row to carry to the profile's browsers and app devices. */
interface ChannelDelivery {
  profile: { id: string; push_tokens: string[] };
  rowId: string;
  text: PushText;
  data: Record<string, string>;
  web: WebPushPayload;
}

/**
 * The network half of a notification: browser push and Expo, side by side. PushService does NOT
 * await it (`void channels.send(...)`): the bell row is written before a request returns, the
 * push services are never on the request path (POST /booking, the WhatsApp webhook). Never throws.
 */
@Injectable()
export class PushChannels {
  private readonly log = new Logger(PushChannels.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PUSH_TRANSPORT) private readonly transport: PushTransport,
    private readonly web: WebPushSender,
  ) {}

  async send(d: ChannelDelivery): Promise<void> {
    const results = await Promise.allSettled([
      this.web.send(d.profile.id, d.web),
      expoDeliver({
        db: this.db,
        transport: this.transport,
        profile: d.profile,
        rowId: d.rowId,
        text: d.text,
        data: d.data,
      }),
    ]);
    for (const r of results) {
      if (r.status === 'rejected')
        this.log.warn(
          `push to ${d.profile.id} failed: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`,
        );
    }
  }
}
