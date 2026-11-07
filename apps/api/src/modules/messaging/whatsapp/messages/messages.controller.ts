import type { MessageView, SendGateView } from '@ab/shared';
import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { MessagesService, type MessageChange } from './messages.service';
import { AppSend } from './app-send';
import { SendGate } from '@/modules/messaging/whatsapp/gate/send-gate';
import { ZodParam } from '@/common/http/zod-inputs';
import { z } from 'zod';

/** The row's id (rule 12: zod at the boundary). */
const messageId = z.uuid();

/** M1–M3 (docs/12 §4): what the admin does with an outbound message that did not go out. */
@ApiTags('messaging')
@ApiBearerAuth()
@Permissions('messages.manage')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly audit: AuditService,
    private readonly sendGate: SendGate,
    private readonly appSends: AppSend,
  ) {}

  /**
   * G: is sending on (env, WhatsApp config, kill switch) and how many rows wait in the queue.
   * Read only, so a teacher's composer (teacher mode) shows the same «الإرسال متوقف» note.
   */
  @Get('gate')
  @Permissions('messages.read')
  gate(): Promise<SendGateView> {
    return this.sendGate.view();
  }

  /** failed → queued, attempts 0 (409 not_retryable otherwise; 409 auto_off for a held row while OFF). */
  @Post(':id/retry')
  @HttpCode(200)
  async retry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MessageView> {
    const change = await this.messages.retry(id, { automaticOn: await this.sendGate.automaticOn() });
    return this.audited({ change, action: 'message_retry', user });
  }

  /** R-MSG-03: queued / failed outbound → sent_manually (409 not_manual otherwise). */
  @Post(':id/sent-manually')
  @HttpCode(200)
  async sentManually(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MessageView> {
    return this.audited({ change: await this.messages.sentManually(id), action: 'message_sent_manually', user });
  }

  /**
   * «أرسل عبر واتساب» (docs/19): a staff text held after the window or failed for it is never sent
   * by the platform for 10 minutes (app_send_until); the app's echo then confirms it. Idempotent:
   * a second tap extends the window. 409 not_app_send (with the row's status) otherwise.
   */
  @Post(':id/app-send')
  @HttpCode(200)
  async appSend(@ZodParam('id', messageId) id: string, @CurrentUser() user: AuthUser): Promise<MessageView> {
    return this.audited({ change: await this.appSends.start(id), action: 'message_app_send', user });
  }

  /** M3: the admin opened wa.me; held (failed «handed_off») until M2 or M1. 409 not_manual otherwise. */
  @Post(':id/hand-off')
  @HttpCode(200)
  async handOff(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MessageView> {
    return this.audited({ change: await this.messages.handOff(id), action: 'message_handed_off', user });
  }

  private async audited(input: { change: MessageChange; action: string; user: AuthUser }): Promise<MessageView> {
    const { before, view } = input.change;
    await this.audit.record({
      actorId: input.user.id,
      entity: 'messages',
      entityId: view.id,
      action: input.action,
      before: { status: before.status, attempts: before.attempts, error_code: before.error_code },
      after: { status: view.status, attempts: view.attempts, sent_manually_at: view.sent_manually_at },
    });
    return view;
  }
}
