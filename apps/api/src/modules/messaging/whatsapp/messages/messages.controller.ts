import {
  messageStatusRoutes as routes,
  sendGateViewSchema,
  type MessageView,
  type SendGateView,
} from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { asResponse } from '@/common/http/returns';
import { MessagesService, type MessageChange } from './messages.service';
import { AppSend } from './app-send';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';

/** M1–M3 (docs/12 §4): what the admin does with an outbound message that did not go out. */
@ApiBearerAuth()
@Controller()
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly audit: AuditService,
    private readonly sendGate: SendGate,
    private readonly appSends: AppSend,
  ) {}

  /** Read only, so a teacher's composer shows the same sending-stopped note. */
  @Route(routes.gate)
  async gate(): Promise<SendGateView> {
    return asResponse(sendGateViewSchema, await this.sendGate.view());
  }

  /** failed → queued, attempts 0; 409 not_retryable, or auto_off for a held row while OFF. */
  @Route(routes.retry)
  @HttpCode(200)
  async retry(
    @RouteInput() { params }: RouteInputOf<typeof routes.retry>,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const change = await this.messages.retry(params.id, {
      automaticOn: await this.sendGate.automaticOn(),
    });
    return this.audited({ change, action: 'message_retry', user });
  }

  /** R-MSG-03: queued / failed outbound → sent_manually (409 not_manual otherwise). */
  @Route(routes.sentManually)
  @HttpCode(200)
  async sentManually(
    @RouteInput() { params }: RouteInputOf<typeof routes.sentManually>,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const change = await this.messages.sentManually(params.id);
    return this.audited({ change, action: 'message_sent_manually', user });
  }

  /** docs/19: held from platform sends for 10 minutes; idempotent; 409 not_app_send otherwise. */
  @Route(routes.appSend)
  @HttpCode(200)
  async appSend(
    @RouteInput() { params }: RouteInputOf<typeof routes.appSend>,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const change = await this.appSends.start(params.id);
    return this.audited({ change, action: 'message_app_send', user });
  }

  /** M3: the admin opened wa.me; held (failed «handed_off») until M2 or M1; 409 not_manual. */
  @Route(routes.handOff)
  @HttpCode(200)
  async handOff(
    @RouteInput() { params }: RouteInputOf<typeof routes.handOff>,
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
    const change = await this.messages.handOff(params.id);
    return this.audited({ change, action: 'message_handed_off', user });
  }

  private async audited(input: {
    change: MessageChange;
    action: string;
    user: AuthUser;
  }): Promise<MessageView> {
    const { before, view } = input.change;
    await this.audit.record({
      actorId: input.user.id,
      entity: 'messages',
      entityId: view.id,
      action: input.action,
      before: { status: before.status, attempts: before.attempts, error_code: before.error_code },
      after: {
        status: view.status,
        attempts: view.attempts,
        sent_manually_at: view.sent_manually_at,
      },
    });
    return view;
  }
}
