import { messageReactionRoutes as routes, type ReactionResult } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { recordSend } from '@/modules/messaging/inbox/send/send-audit';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { ThreadReactionService } from './thread-reaction.service';

// A bad phone answers 400 invalid_phone, not the envelope; a bad body still wins over it.
const phoneFirst = { paramErrors: [{ name: 'phone', fail: invalidPhone }] };

/** Same scopes as POST /threads/:phone/text, audited like a text send. */
@ApiBearerAuth()
@Controller()
export class ThreadReactionController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly reactions: ThreadReactionService,
    private readonly audit: AuditService,
  ) {}

  @Route(routes.react)
  @HttpCode(200)
  async react(
    @RouteInput(phoneFirst) { params, body }: RouteInputOf<typeof routes.react>,
    @CurrentUser() user: AuthUser,
  ): Promise<ReactionResult> {
    const { phone } = params;
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    const request = { phone, messageId: params.id, input: body, actorId: user.id, scope, sales };
    const { result, sent } = await this.reactions.react(request);
    await recordSend(this.audit, { sent, action: 'thread_reaction', user, scope, sales });
    return result;
  }
}
