import { Module } from '@nestjs/common';
import { GateController } from './gate.controller';
import { GateSettings } from './gate.settings';

/** PUT /messages/gate/*: the send gate's switches; AuditService and settings are global. */
@Module({
  controllers: [GateController],
  providers: [GateSettings],
})
export class WhatsappGateModule {}
