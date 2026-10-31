import { Global, Module } from '@nestjs/common';
import { loadEnv, webPushEnv } from '@/config/env/env';
import { EXPO_PUSH_PATH, type ExpoMessage, type ExpoTicket } from './expo/expo-push';
import { NotificationsController, WebPushController } from './notifications.controller';
import { NotificationsRepo } from './notifications.repo';
import { PushAudience } from './dispatch/push.audience';
import { PushChannels } from './dispatch/push.channels';
import { PUSH_TRANSPORT, PushService, type PushTransport } from './push.service';
import { fetchTransport, WEB_PUSH_KEYS, WEB_PUSH_TRANSPORT, WebPushSender, type WebPushKeysSource } from './web/web-push.sender';

/** Expo's batch limit per request. */
const EXPO_BATCH = 100;
const EXPO_TIMEOUT_MS = 10_000;

export interface ExpoConn {
  /** EXPO_API_BASE; unset = push off. */
  base: string | undefined;
  accessToken: string | undefined;
}

/** EXPO_API_BASE unset (local, e2e): every message gets an error ticket, nothing leaves the server. */
const PUSH_OFF: PushTransport = async (messages) =>
  messages.map(() => ({ status: 'error' as const, message: 'push off: EXPO_API_BASE is not set' }));

function expoTransport({ base, accessToken }: ExpoConn): PushTransport {
  if (!base) return PUSH_OFF;
  const url = `${base.replace(/\/+$/, '')}${EXPO_PUSH_PATH}`;
  return async (messages: ExpoMessage[]) => {
    const tickets: ExpoTicket[] = [];
    for (let i = 0; i < messages.length; i += EXPO_BATCH) {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(messages.slice(i, i + EXPO_BATCH)),
        // Off the request path (PushChannels), but a hung Expo must not pile up sends.
        signal: AbortSignal.timeout(EXPO_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`expo push HTTP ${res.status}`);
      tickets.push(...((await res.json()) as { data: ExpoTicket[] }).data);
    }
    return tickets;
  };
}

/**
 * Global: the webhook, the sender, the booking and the jobs all inject PushService (docs/12 §6).
 * Also the bell's own routes (/me/notifications, /me/web-push; R-NOT-01, R-NOT-02).
 */
@Global()
@Module({
  controllers: [NotificationsController, WebPushController],
  providers: [
    PushService,
    PushAudience,
    PushChannels,
    NotificationsRepo,
    WebPushSender,
    { provide: WEB_PUSH_TRANSPORT, useValue: fetchTransport },
    // WEB_PUSH_* read per send, like EXPO_*: all three unset (local, e2e) = browser push off.
    { provide: WEB_PUSH_KEYS, useValue: ((): ReturnType<WebPushKeysSource> => webPushEnv(loadEnv())) satisfies WebPushKeysSource },
    {
      provide: PUSH_TRANSPORT,
      // EXPO_* read per call: the admin may change them in «التكاملات» (no restart).
      useFactory: (): PushTransport => (messages) => {
        const env = loadEnv();
        return expoTransport({ base: env.EXPO_API_BASE, accessToken: env.EXPO_ACCESS_TOKEN })(messages);
      },
    },
  ],
  exports: [PushService],
})
export class PushModule {}
