import {
  PENDING_IDS_MAX,
  phoneE164,
  sendsAllTemplates,
  threadTemplateSchema,
  threadTextSchema,
  type MessageView,
  type ThreadTemplate,
  type ThreadText,
} from '@ab/shared';
import { Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { ZodBody, ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { invalidPhone, phoneParam } from './phone-param';
import { onePageMode } from '@/modules/messaging/inbox/reads/page-mode';
import type { SalesScope } from '@/modules/sales/sales/sales-scope';
import type { TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { threadListQuery } from './threads.list';
import { recordSend, type SendAudit } from '@/modules/messaging/inbox/send/send-audit';
import { ThreadSendService } from '@/modules/messaging/inbox/send/thread-send.service';

const detailQuery = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  /** With `before`: the oldest loaded row's id (the compound keyset, docs/37 NEW 4). */
  before_id: z.uuid().optional(),
  /** The window around one message (a search hit, docs/37 NEW 3). */
  around: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/** ?after= (the delta refresh) with the client's outgoing rows still moving: `pending=<uuid>,<uuid>`. */
const deltaQuery = detailQuery.omit({ before: true }).extend({
  after: z.iso.datetime({ offset: true }),
  pending: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').filter(Boolean) : []))
    .pipe(z.array(z.uuid()).max(PENDING_IDS_MAX)),
  /** A delta never mixes with a window (onePageMode: around excludes after). */
  around: z.never().optional(),
});

/** The detail's page mode, checked only when parsed (zod 4 refuses omit on a refined schema). */
const onePage = detailQuery.superRefine((q, ctx) => {
  for (const code of onePageMode(q)) ctx.addIssue({ code: 'custom', message: code });
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
  list(
    @ZodQuery(threadListQuery) query: z.output<typeof threadListQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reads.list(query, user);
  }

  /** A page (`before`), or with `after` only what changed since (ThreadDelta, ~2 reads). */
  @Get(':phone')
  detail(
    @ZodParam('phone', phoneE164, invalidPhone) phone: string,
    @Query() query: Record<string, unknown> | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    if (query?.['after'] !== undefined)
      return this.reads.delta({ phone, ...parseOrThrow(deltaQuery, query) }, user);
    return this.reads.detail({ phone, ...parseOrThrow(onePage, query) }, user);
  }

  @Post(':phone/text')
  @HttpCode(201)
  @Permissions('inbox.send')
  async text(
    @Param('phone') raw: string,
    @ZodBody(threadTextSchema) input: ThreadText,
    @CurrentUser() user: AuthUser,
  ) {
    const { scope, sales } = await this.scopes(user);
    const sent = await this.sends.text({
      phone: phoneParam(raw),
      input,
      actorId: user.id,
      scope,
      sales,
      role: user.role,
    });
    const action = input.correctsId ? 'thread_correction' : 'thread_text';
    return this.audited({ sent, action, user, scope, sales });
  }

  @Post(':phone/template')
  @HttpCode(201)
  @Permissions('inbox.send')
  async template(
    @Param('phone') raw: string,
    @ZodBody(threadTemplateSchema) input: ThreadTemplate,
    @CurrentUser() user: AuthUser,
  ) {
    const { scope, sales } = await this.scopes(user);
    const restricted = !sendsAllTemplates(user);
    const sent = await this.sends.template({
      phone: phoneParam(raw),
      input,
      actorId: user.id,
      scope,
      sales,
      restricted,
    });
    return this.audited({ sent, action: 'thread_template', user, scope, sales });
  }

  /** Who is sending: a salesperson (their SalesScope), a teacher (TeacherScope) or the admin (neither). */
  private async scopes(
    user: AuthUser,
  ): Promise<{ scope: TeacherScope | null; sales: SalesScope | null }> {
    const sales = await this.reads.salesScope(user);
    return { sales, scope: sales ? null : await this.reads.scope(user) };
  }

  /** A teacher's send names them in the audit row too (every message a teacher sends is logged). */
  private audited(input: SendAudit): Promise<MessageView> {
    return recordSend(this.audit, input);
  }
}
