import { Module } from '@nestjs/common';
import { loadEnv } from '../../../config/env/env';
import { PushReceiptsJob } from './push-receipts.job';
import { PushReceiptsQueries } from './push-receipts.queries';
import { expoReceiptsTransport, RECEIPTS_TRANSPORT, type ReceiptsTransport } from './receipts.transport';

/**
 * R-MOB-01: Expo push receipts + DeviceNotRegistered pruning. Sending itself (PushService,
 * dedup, batching, ticket pruning) is the global common/push module. Register in app.module.ts.
 */
@Module({
  providers: [
    PushReceiptsQueries,
    PushReceiptsJob,
    {
      provide: RECEIPTS_TRANSPORT,
      // EXPO_* read per call: the admin may change them in «التكاملات» (no restart).
      useFactory: (): ReceiptsTransport => (ids) => {
        const env = loadEnv();
        return expoReceiptsTransport({ base: env.EXPO_API_BASE, accessToken: env.EXPO_ACCESS_TOKEN })(ids);
      },
    },
  ],
})
export class PushReceiptsModule {}
