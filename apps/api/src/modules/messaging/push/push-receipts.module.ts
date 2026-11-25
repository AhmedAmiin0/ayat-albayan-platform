import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { PushReceiptsJob } from './push-receipts.job';
import { PushReceiptsRepo } from './push-receipts.repo';
import { expoReceiptsTransport, RECEIPTS_TRANSPORT, type ReceiptsTransport } from './receipts.transport';

/**
 * R-MOB-01: Expo push receipts + DeviceNotRegistered pruning. Sending itself (PushService,
 * dedup, batching, ticket pruning) is the global common/push module. Register in app.module.ts.
 */
@Module({
  providers: [
    PushReceiptsRepo,
    PushReceiptsJob,
    {
      provide: RECEIPTS_TRANSPORT,
      // Read per call so the admin can change them in integrations without a restart.
      useFactory: (): ReceiptsTransport => (ids) => {
        const env = loadEnv();
        return expoReceiptsTransport({
          base: env.EXPO_API_BASE,
          accessToken: env.EXPO_ACCESS_TOKEN,
        })(ids);
      },
    },
  ],
})
export class PushReceiptsModule {}
