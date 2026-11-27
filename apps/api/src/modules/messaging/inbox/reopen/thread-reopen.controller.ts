import { threadReopenRoutes as routes } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
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
@Controller()
export class ThreadReopenController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly reopens: ThreadReopenService,
  ) {}

  @Route(routes.reopen)
  @HttpCode(200)
  @Permissions('inbox.send')
  async reopen(
    @RouteInput({ badParam: invalidPhone }) { params }: RouteInputOf<typeof routes.reopen>,
    @CurrentUser() user: AuthUser,
  ) {
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    return this.reopens.reopen({ phone: params.phone, scope });
  }
}
