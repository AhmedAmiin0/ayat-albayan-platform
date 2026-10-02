import { Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { PushReceiptsJob } from './push-receipts.job';
import { PushReceiptsQueries } from './push-receipts.queries';
import { expoReceiptsTransport, RECEIPTS_TRANSPORT } from './receipts.transport';

/**
 * R-MOB-01: Expo push receipts + DeviceNotRegistered pruning. Sending itself (PushService,
 * dedup, batching, ticket pruning) is the global common/push module. Register in app.module.ts.
 */
@Module({
  providers: [
    PushReceiptsQueries,
    PushReceiptsJob,
    { provide: RECEIPTS_TRANSPORT, useFactory: () => expoReceiptsTransport(loadEnv().EXPO_ACCESS_TOKEN) },
  ],
})
export class PushReceiptsModule {}
