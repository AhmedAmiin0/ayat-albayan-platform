import { Module } from '@nestjs/common';
import { RateLimitRepo } from '@/common/http/rate-limit.repo';
import { RelayController } from './relay.controller';
import { RelayLimit } from './relay.limit';
import { RelayLine } from './relay.line';
import { RelayRepo } from './relay.repo';
import { RelayService } from './relay.service';

/** POST /script-relay/api/v1/messages and GET /script-relay/api/v1/me (docs/19 «script relay»). */
@Module({
  controllers: [RelayController],
  providers: [RateLimitRepo, RelayLimit, RelayLine, RelayRepo, RelayService],
})
export class ScriptRelayModule {}
