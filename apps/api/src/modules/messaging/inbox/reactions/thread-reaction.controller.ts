import { threadReactionSchema, type ReactionResult, type ThreadReaction } from '@ab/shared';
import { Controller, HttpCode, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParams } from '@/common/http/zod-inputs';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { phoneParam } from '@/modules/messaging/inbox/threads/phone-param';
import { ThreadReactionService } from './thread-reaction.service';

const params = z.object({ phone: z.string(), id: z.uuid() });

/** Same permissions and scopes as POST /threads/:phone/text, audited like a text send. */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadReactionController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly reactions: ThreadReactionService,
    private readonly audit: AuditService,
  ) {}

  @Put(':phone/messages/:id/reaction')
  @HttpCode(200)
  @Permissions('inbox.send')
  async react(
    @ZodParams(params) { phone, id }: z.output<typeof params>,
    @ZodBody(threadReactionSchema) input: ThreadReaction,
    @CurrentUser() user: AuthUser,
  ): Promise<ReactionResult> {
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    const request = {
      phone: phoneParam(phone),
      messageId: id,
      input,
      actorId: user.id,
      scope,
      sales,
    };
    const { result, sent } = await this.reactions.react(request);
    await recordSend(this.audit, { sent, action: 'thread_reaction', user, scope, sales });
    return result;
  }
}
