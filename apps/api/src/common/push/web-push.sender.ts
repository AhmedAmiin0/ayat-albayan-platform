import { Inject, Injectable, Logger } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { encryptPayload } from './web-push.crypto';
import { liveSessions } from './push.sessions';
import { pushEndpointAllowed } from './web-push.endpoint';
import { vapidAuthorization, type VapidKeys } from './web-push.vapid';

/** One POST to a push service; the status is all we read. Injectable: tests never reach the network. */
export type WebPushTransport = (req: { url: string; headers: Record<string, string>; body: Buffer }) => Promise<{ status: number }>;
export const WEB_PUSH_TRANSPORT = Symbol('WEB_PUSH_TRANSPORT');
/** The VAPID keys now (webPushEnv(loadEnv()), read per send: «التكاملات» may change them); null = off. */
export const WEB_PUSH_KEYS = Symbol('WEB_PUSH_KEYS');
export type WebPushKeysSource = () => VapidKeys | null;

/** What apps/web/public/sw.js shows: a same-origin `url` opened on click; `tag` folds repeats. */
export interface WebPushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Push services keep an undelivered message this long (the browser was offline). */
export const WEB_PUSH_TTL_S = 86_400;
export const WEB_PUSH_BODY_MAX = 240;

/** fetch without following redirects (the allow-list is checked on the URL we were given only). */
export const fetchTransport: WebPushTransport = async ({ url, headers, body }) => {
  const res = await fetch(url, { method: 'POST', headers, body, redirect: 'manual', signal: AbortSignal.timeout(10_000) });
  return { status: res.status };
};

/**
 * The push service refuses this subscription for good: 404/410 gone, 400 malformed, 403 the VAPID
 * key does not match the one it was made with, 413 too large. 401 (our JWT) and 429/5xx are kept.
 */
const GONE: ReadonlySet<number> = new Set([400, 403, 404, 410, 413]);

const clip = (text: string) =>
  text.length > WEB_PUSH_BODY_MAX ? `${text.slice(0, WEB_PUSH_BODY_MAX - 1)}…` : text;

/**
 * Browser push (R-NOT-02): one encrypted POST per subscription of the profile bound to a live session. Off (no call at all)
 * until the three WEB_PUSH_* values are set. A GONE status: the row is deleted;
 * an endpoint off the allow-list is deleted unsent. Never throws.
 */
@Injectable()
export class WebPushSender {
  private readonly log = new Logger(WebPushSender.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(WEB_PUSH_TRANSPORT) private readonly transport: WebPushTransport,
    @Inject(WEB_PUSH_KEYS) private readonly keys: WebPushKeysSource,
  ) {}

  /** How many browsers accepted it. */
  async send(profileId: string, payload: WebPushPayload): Promise<number> {
    try {
      const keys = this.keys();
      if (!keys) return 0;
      const { data, error } = await this.db.from('web_push_subscriptions').select('id, endpoint, p256dh, auth, session_id').eq('profile_id', profileId);
      if (error) throw new Error(error.message);
      // Only browsers bound to a live session of this profile (migration 700; null = not yet re-bound).
      const live = await liveSessions(this.db, data.map((s) => s.session_id));
      const subs = data.filter((s) => s.session_id !== null && live.has(s.session_id));
      const body = Buffer.from(JSON.stringify({ ...payload, body: clip(payload.body) }));
      const sent = await Promise.allSettled(subs.map((sub) => this.one({ sub, keys, body })));
      return sent.filter((r) => r.status === 'fulfilled' && r.value).length;
    } catch (e) {
      this.log.warn(`web push to ${profileId} failed: ${e instanceof Error ? e.message : String(e)}`);
      return 0;
    }
  }

  private async one(input: { sub: { id: string; endpoint: string; p256dh: string; auth: string }; keys: VapidKeys; body: Buffer }): Promise<boolean> {
    const { sub } = input;
    if (!pushEndpointAllowed(sub.endpoint)) return this.drop(sub.id, false);
    try {
      const res = await this.transport({
        url: sub.endpoint,
        headers: {
          authorization: await vapidAuthorization(sub.endpoint, input.keys),
          'content-encoding': 'aes128gcm',
          'content-type': 'application/octet-stream',
          ttl: String(WEB_PUSH_TTL_S),
          urgency: 'normal',
        },
        body: encryptPayload(input.body, { p256dh: sub.p256dh, auth: sub.auth }),
      });
      if (GONE.has(res.status)) return this.drop(sub.id, false);
      if (res.status >= 200 && res.status < 300) return true;
      this.log.warn(`web push HTTP ${res.status} (subscription ${sub.id} kept)`);
    } catch (e) {
      this.log.warn(`web push to subscription ${sub.id} failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return false;
  }

  private async drop(id: string, result: boolean): Promise<boolean> {
    const { error } = await this.db.from('web_push_subscriptions').delete().eq('id', id);
    if (error) this.log.warn(`dropping web push subscription ${id} failed: ${error.message}`);
    return result;
  }
}
