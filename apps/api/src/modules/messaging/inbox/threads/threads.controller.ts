import { sendsAllTemplates, threadTemplateSchema, threadTextSchema, type MessageView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '../../../../common/audit/audit.service';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { phoneParam } from './phone-param';
import type { SalesScope } from '../../../sales/sales/sales-scope';
import type { TeacherScope } from '../teacher-threads/teacher-scope';
import { ThreadReads } from '../reads/thread-reads';
import { threadListQuery } from './threads.list';
import { recordSend, type SendAudit } from '../send/send-audit';
import { ThreadSendService } from '../send/thread-send.service';

const detailQuery = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * H1–H4 (docs/12 §4): the WhatsApp inbox (R-LEAD-02, R-MSG-05). Sends are audited. Same paths for
 * the admin (everything) and, in teacher mode, a teacher (TeacherScope: their families' chats and
 * their own, server-side; R-TCH-03).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadsController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly sends: ThreadSendService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.reads.list(parseOrThrow(threadListQuery, query), user);
  }

  @Get(':phone')
  detail(@Param('phone') raw: string, @Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.reads.detail({ phone: phoneParam(raw), ...parseOrThrow(detailQuery, query) }, user);
  }

  @Post(':phone/text')
  @HttpCode(201)
  @Permissions('inbox.send')
  async text(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = parseOrThrow(threadTextSchema, body);
    const { scope, sales } = await this.scopes(user);
    const sent = await this.sends.text({ phone: phoneParam(raw), input, actorId: user.id, scope, sales });
    return this.audited({ sent, action: 'thread_text', user, scope, sales });
  }

  @Post(':phone/template')
  @HttpCode(201)
  @Permissions('inbox.send')
  async template(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = parseOrThrow(threadTemplateSchema, body);
    const { scope, sales } = await this.scopes(user);
    const restricted = !sendsAllTemplates(user);
    const sent = await this.sends.template({ phone: phoneParam(raw), input, actorId: user.id, scope, sales, restricted });
    return this.audited({ sent, action: 'thread_template', user, scope, sales });
  }

  /** Who is sending: a salesperson (their SalesScope), a teacher (TeacherScope) or the admin (neither). */
  private async scopes(user: AuthUser): Promise<{ scope: TeacherScope | null; sales: SalesScope | null }> {
    const sales = await this.reads.salesScope(user);
    return { sales, scope: sales ? null : await this.reads.scope(user) };
  }

  /** A teacher's send names them in the audit row too (every message a teacher sends is logged). */
  private audited(input: SendAudit): Promise<MessageView> {
    return recordSend(this.audit, input);
  }
}
