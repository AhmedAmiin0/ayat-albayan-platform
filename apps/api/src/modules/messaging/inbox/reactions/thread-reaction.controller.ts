import { threadReactionSchema, type ReactionResult } from '@ab/shared';
import { Body, Controller, HttpCode, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '../../../../common/audit/audit.service';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { ThreadReads } from '../reads/thread-reads';
import { recordSend } from '../send/send-audit';
import { phoneParam } from '../threads/phone-param';
import { ThreadReactionService } from './thread-reaction.service';

const params = z.object({ phone: z.string(), id: z.uuid() });

/**
 * «تفاعل» (owner 2026-10-27): hold a bubble, tap an emoji; the family sees it on WhatsApp. The same
 * permissions and scopes as POST /threads/:phone/text (inbox.send; a salesperson any chat, a teacher
 * their own families), audited like a text send.
 */
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
  async react(@Param() raw: unknown, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ReactionResult> {
    const { phone, id } = parseOrThrow(params, raw);
    const input = parseOrThrow(threadReactionSchema, body);
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    const request = { phone: phoneParam(phone), messageId: id, input, actorId: user.id, scope, sales };
    const { result, sent } = await this.reactions.react(request);
    await recordSend(this.audit, { sent, action: 'thread_reaction', user, scope, sales });
    return result;
  }
}
