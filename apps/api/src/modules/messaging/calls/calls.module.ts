import { Module } from '@nestjs/common';
import { SalesModule } from '../../sales/sales/sales.module';
import { InboxModule } from '../inbox/inbox.module';
import { CallAccess } from './access/call-access';
import { CallsGate } from './access/calls-gate';
import { CallsSettings } from './calls.settings';
import { CallEvents, CALL_EVENTS } from './flow/call-events.service';
import { CallFlows } from './flow/call-flows';
import { CallsKit } from './flow/call-kit';
import { CallPermissions } from './flow/call-permission.service';
import { CallReads } from './flow/call-reads.service';
import { CallsSweeper } from './flow/calls.sweeper';
import { InboundCalls } from './flow/inbound.service';
import { OutboundCalls } from './flow/outbound.service';
import { CallPermissionController } from './http/call-permission.controller';
import { CallsController } from './http/calls.controller';
import { CALLS_API } from './kapso/calls-api';
import { KapsoCallsApi } from './kapso/kapso-calls';
import { CallsQueries } from './store/calls.queries';

/**
 * WhatsApp voice calls from the chat number (docs/28), dark behind whatsapp_calls_enabled. InboxModule
 * brings the outbox (the permission request), the chats and the teacher scopes; SalesModule the sales
 * scopes. CALL_EVENTS is the port WebhookModule feeds the parsed `calls` items into.
 */
@Module({
  imports: [InboxModule, SalesModule],
  controllers: [CallsController, CallPermissionController],
  providers: [
    { provide: CALLS_API, useFactory: () => new KapsoCallsApi() },
    { provide: CALL_EVENTS, useExisting: CallEvents },
    ...[CallsQueries, CallsKit, CallsSettings, CallsGate, CallAccess, CallEvents, CallFlows],
    ...[OutboundCalls, InboundCalls, CallPermissions, CallReads, CallsSweeper],
  ],
  exports: [CALL_EVENTS],
})
export class CallsModule {}
