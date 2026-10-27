import { sendsAllTemplates, type ThreadReopenView } from '@ab/shared';
import { Controller, HttpCode, Logger, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../../../common/audit/audit.service';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { ThreadReads } from '../reads/thread-reads';
import { recordSend } from '../send/send-audit';
import { phoneParam } from '../threads/phone-param';
import { last4 } from './kapso-reopener';
import { ThreadReopenService } from './thread-reopen.service';

/**
 * POST /threads/:phone/reopen (owner 2026-10-26): the inbox calls it once when a staff member opens a
 * thread whose 24 h window is closed. The same guards as a send from that thread (inbox.send, the
 * teacher's scope); 200 with what happened, whatever Kapso (or the audit) answered. A queued template is audited like
 * the composer's (thread_reopen_template, under who opened it).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadReopenController {
  private readonly log = new Logger('ThreadReopen');

  constructor(
    private readonly reads: ThreadReads,
    private readonly reopens: ThreadReopenService,
    private readonly audit: AuditService,
  ) {}

  @Post(':phone/reopen')
  @HttpCode(200)
  @Permissions('inbox.send')
  async reopen(@Param('phone') raw: string, @CurrentUser() user: AuthUser): Promise<ThreadReopenView> {
    const phone = phoneParam(raw);
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    const { view, sent } = await this.reopens.reopen({ phone, actorId: user.id, scope, sales, restricted: !sendsAllTemplates(user) });
    // The row is queued: a failed audit never turns that into an error (the phone would say «send it by hand»: a second copy).
    if (sent) await recordSend(this.audit, { sent, action: 'thread_reopen_template', user, scope, sales }).catch(() => this.log.warn(`reopen audit failed for ${last4(phone)}`));
    return view;
  }
}
