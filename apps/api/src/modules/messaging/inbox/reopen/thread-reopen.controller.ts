import { phoneE164, type ThreadReopenView } from '@ab/shared';
import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam } from '@/common/http/zod-inputs';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { invalidPhone } from '@/modules/messaging/inbox/threads/phone-param';
import { ThreadReopenService } from './thread-reopen.service';

/**
 * POST /threads/:phone/reopen: kept for app builds older than 2026-11-07, which call it when a
 * staff member opens a closed chat. It only answers the window state and sends nothing
 * (ThreadReopenService); the same guards as a send from that thread (inbox.send, the teacher's
 * scope). New clients never call it.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadReopenController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly reopens: ThreadReopenService,
  ) {}

  @Post(':phone/reopen')
  @HttpCode(200)
  @Permissions('inbox.send')
  async reopen(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ThreadReopenView> {
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    return this.reopens.reopen({ phone, scope });
  }
}
