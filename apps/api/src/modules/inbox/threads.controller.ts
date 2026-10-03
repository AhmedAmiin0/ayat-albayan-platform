import { threadTemplateSchema, threadTextSchema, type MessageView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { pageQuerySchema, parseOrThrow } from '../teachers/http';
import { phoneParam } from './phone-param';
import type { SalesScope } from '../sales/sales-scope';
import type { TeacherScope } from './teacher-scope';
import { ThreadReads } from './thread-reads';
import type { Sent } from './outbox';
import { ThreadSendService } from './thread-send.service';

const listQuery = pageQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  unread: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});
const detailQuery = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

type Audited = { sent: Sent; action: string; user: AuthUser; scope: TeacherScope | null; sales: SalesScope | null };

/**
 * H1–H4 (docs/12 §4): the WhatsApp inbox (R-LEAD-02, R-MSG-05). Sends are audited. Same paths for
 * the admin (everything) and, in teacher mode, a teacher (TeacherScope: their families' chats and
 * their own, server-side; R-TCH-03).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Roles('admin', 'teacher', 'sales')
@Controller('threads')
export class ThreadsController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly sends: ThreadSendService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.reads.list(parseOrThrow(listQuery, query), user);
  }

  @Get(':phone')
  detail(@Param('phone') raw: string, @Query() query: unknown, @CurrentUser() user: AuthUser) {
    return this.reads.detail({ phone: phoneParam(raw), ...parseOrThrow(detailQuery, query) }, user);
  }

  @Post(':phone/text')
  @HttpCode(201)
  async text(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = parseOrThrow(threadTextSchema, body);
    const { scope, sales } = await this.scopes(user);
    const sent = await this.sends.text({ phone: phoneParam(raw), input, actorId: user.id, scope, sales });
    return this.audited({ sent, action: 'thread_text', user, scope, sales });
  }

  @Post(':phone/template')
  @HttpCode(201)
  async template(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = parseOrThrow(threadTemplateSchema, body);
    const { scope, sales } = await this.scopes(user);
    const sent = await this.sends.template({ phone: phoneParam(raw), input, actorId: user.id, scope, sales });
    return this.audited({ sent, action: 'thread_template', user, scope, sales });
  }

  /** Who is sending: a salesperson (their SalesScope), a teacher (TeacherScope) or the admin (neither). */
  private async scopes(user: AuthUser): Promise<{ scope: TeacherScope | null; sales: SalesScope | null }> {
    const sales = await this.reads.salesScope(user);
    return { sales, scope: sales ? null : await this.reads.scope(user) };
  }

  /** A teacher's send names them in the audit row too (every message a teacher sends is logged). */
  private async audited(input: Audited): Promise<MessageView> {
    const { sent, scope, sales } = input;
    const { view } = sent;
    if (sent.replayed) return view; // a retried request id: the first send was audited already
    const teacher = scope ? { teacher_id: scope.teacherId, teacher_name: scope.teacherName } : {};
    const by = sales ? { sales_id: sales.salesId } : teacher;
    await this.audit.record({
      actorId: input.user.id,
      entity: 'messages',
      entityId: view.id,
      action: input.action,
      before: null,
      after: { phone: view.phone_e164, template_key: view.template_key, status: view.status, ...by },
    });
    return view;
  }
}
