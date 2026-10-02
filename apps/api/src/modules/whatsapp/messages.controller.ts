import type { MessageView } from '@ab/shared';
import { Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { MessagesService, type MessageChange } from './messages.service';

/** M1–M2 (docs/12 §4): what the admin does with an outbound message that did not go out. */
@ApiTags('messaging')
@ApiBearerAuth()
@Roles('admin')
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messages: MessagesService,
    private readonly audit: AuditService,
  ) {}

  /** failed → queued, attempts 0 (409 not_retryable otherwise). */
  @Post(':id/retry')
  @HttpCode(200)
  async retry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MessageView> {
    return this.audited({ change: await this.messages.retry(id), action: 'message_retry', user });
  }

  /** R-MSG-03: queued / failed outbound → sent_manually (409 not_manual otherwise). */
  @Post(':id/sent-manually')
  @HttpCode(200)
  async sentManually(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<MessageView> {
    return this.audited({ change: await this.messages.sentManually(id), action: 'message_sent_manually', user });
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
