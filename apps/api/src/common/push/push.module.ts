import { Global, Module } from '@nestjs/common';
import { loadEnv, webPushEnv } from '@/config/env/env';
import { expoTransport } from './expo/expo-transport';
import { NotificationsController, WebPushController } from './notifications.controller';
import { NotificationsRepo } from './notifications.repo';
import { PushAudience } from './dispatch/push.audience';
import { PushChannels } from './dispatch/push.channels';
import { PUSH_TRANSPORT, PushService, type PushTransport } from './push.service';
import { fetchTransport, WEB_PUSH_KEYS, WEB_PUSH_TRANSPORT, WebPushSender, type WebPushKeysSource } from './web/web-push.sender';

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
        const conn = { base: env.EXPO_API_BASE, accessToken: env.EXPO_ACCESS_TOKEN };
        return expoTransport(conn)(messages);
      },
    },
  ],
  exports: [PushService],
})
export class PushModule {}
