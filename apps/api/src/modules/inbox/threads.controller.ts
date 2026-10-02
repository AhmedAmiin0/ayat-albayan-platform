import { normalizePhone, threadTemplateSchema, threadTextSchema, type MessageView } from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '../../common/audit/audit.service';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { pageQuerySchema, parseOrThrow } from '../teachers/http';
import { waHttpError } from '../whatsapp/template.mapper';
import { TeacherScopes, type TeacherScope } from './teacher-scope';
import { TeacherThreadsService } from './teacher-threads.service';
import { ThreadSendService } from './thread-send.service';
import { ThreadsService } from './threads.service';

const listQuery = pageQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  unread: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});
const detailQuery = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** `:phone` is url-encoded E.164 («%2B9665…»); anything else is 400 invalid_phone. */
function phoneParam(raw: string): string {
  const phone = normalizePhone(raw);
  if (!phone.ok) throw waHttpError('invalid_phone', 400);
  return phone.e164;
}

type Audited = { view: MessageView; action: string; user: AuthUser; scope: TeacherScope | null };

/**
 * H1–H4 (docs/12 §4): the WhatsApp inbox (R-LEAD-02, R-MSG-05). Sends are audited. Same paths for
 * the admin (everything) and, in teacher mode, a teacher (TeacherScope: their families' chats and
 * their own, server-side; R-TCH-03).
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Roles('admin', 'teacher')
@Controller('threads')
export class ThreadsController {
  constructor(
    private readonly threads: ThreadsService,
    private readonly teacherThreads: TeacherThreadsService,
    private readonly sends: ThreadSendService,
    private readonly scopes: TeacherScopes,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query() query: unknown, @CurrentUser() user: AuthUser) {
    const filter = parseOrThrow(listQuery, query);
    const scope = await this.scopes.of(user);
    return scope ? this.teacherThreads.list(filter, scope) : this.threads.list(filter);
  }

  @Get(':phone')
  async detail(@Param('phone') raw: string, @Query() query: unknown, @CurrentUser() user: AuthUser) {
    const page = { phone: phoneParam(raw), ...parseOrThrow(detailQuery, query) };
    const scope = await this.scopes.of(user);
    return scope ? this.teacherThreads.detail(page, scope) : this.threads.detail(page);
  }

  @Post(':phone/text')
  @HttpCode(201)
  async text(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = parseOrThrow(threadTextSchema, body);
    const scope = await this.scopes.of(user);
    const view = await this.sends.text({ phone: phoneParam(raw), input, actorId: user.id, scope });
    return this.audited({ view, action: 'thread_text', user, scope });
  }

  @Post(':phone/template')
  @HttpCode(201)
  async template(@Param('phone') raw: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    const input = parseOrThrow(threadTemplateSchema, body);
    const scope = await this.scopes.of(user);
    const view = await this.sends.template({ phone: phoneParam(raw), input, actorId: user.id, scope });
    return this.audited({ view, action: 'thread_template', user, scope });
  }

  /** A teacher's send names them in the audit row too (every message a teacher sends is logged). */
  private async audited(input: Audited): Promise<MessageView> {
    const { view, scope } = input;
    const teacher = scope ? { teacher_id: scope.teacherId, teacher_name: scope.teacherName } : {};
    await this.audit.record({
      actorId: input.user.id,
      entity: 'messages',
      entityId: view.id,
      action: input.action,
      before: null,
      after: { phone: view.phone_e164, template_key: view.template_key, status: view.status, ...teacher },
    });
    return view;
  }
}
