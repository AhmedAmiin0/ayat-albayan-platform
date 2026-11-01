import { Module } from '@nestjs/common';
import { RelayController } from './relay.controller';
import { RelayLine } from './relay.line';
import { RelayRepo } from './relay.repo';
import { RelayService } from './relay.service';

/** POST /script-relay/api/v1/messages and GET /script-relay/api/v1/me (docs/19 «script relay»). */
@Module({
  controllers: [RelayController],
  providers: [RelayLine, RelayRepo, RelayService],
})
export class ScriptRelayModule {}
