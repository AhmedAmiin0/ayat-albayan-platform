import {
  sendsAllTemplates,
  threadReadRoutes as chats,
  threadSendRoutes as sends,
  type MessageView,
  type TextSendAnswer,
  type ThreadDelta,
  type ThreadDetail,
  type ThreadView,
} from '@ab/shared';
import type { Page } from '@ab/core';
import { Controller, HttpCode, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { ZodBody } from '@/common/http/zod-inputs';
import { invalidPhone, phoneParam } from './phone-param';
import type { SalesScope } from '@/modules/sales/sales/sales-scope';
import type { TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { recordSend, type SendAudit } from '@/modules/messaging/inbox/send/send-audit';
import { ThreadSendService } from '@/modules/messaging/inbox/send/thread-send.service';

/**
 * H1–H4 (docs/12 §4): the WhatsApp inbox (R-LEAD-02, R-MSG-05). Sends are audited. Same paths for
 * the admin (everything) and, in teacher mode, a teacher (TeacherScope: their families' chats and
 * their own, server-side; R-TCH-03).
 */
@ApiBearerAuth()
@Controller()
export class ThreadsController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly sends: ThreadSendService,
    private readonly audit: AuditService,
  ) {}

  @Route(chats.list)
  list(
    @RouteInput() { query }: RouteInputOf<typeof chats.list>,
    @CurrentUser() user: AuthUser,
  ): Promise<Page<ThreadView>> {
    return this.reads.list(query, user);
  }

  /** A page (`before`), or with `after` only what changed since (ThreadDelta, ~2 reads). */
  @Route(chats.detail)
  detail(
    @RouteInput({ badParam: invalidPhone }) { params, query }: RouteInputOf<typeof chats.detail>,
    @CurrentUser() user: AuthUser,
  ): Promise<ThreadDetail | ThreadDelta> {
    const { phone } = params;
    if (query.mode === 'page') {
      const { mode: _page, ...page } = query;
      return this.reads.detail({ phone, ...page }, user);
    }
    const { mode: _delta, ...delta } = query;
    return this.reads.delta({ phone, ...delta }, user);
  }

  @Route(sends.text)
  @HttpCode(201)
  async text(
    @Param('phone') raw: string,
    @ZodBody(sends.text.body) input: RouteInputOf<typeof sends.text>['body'],
    @CurrentUser() user: AuthUser,
  ): Promise<TextSendAnswer> {
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
    const view = await this.audited({ sent, action, user, scope, sales });
    // `replayed`: the first row came back (docs/44 M1); `same_request`: it is this correction.
    return { ...view, replayed: sent.replayed, same_request: sent.sameRequest === true };
  }

  @Route(sends.template)
  @HttpCode(201)
  async template(
    @Param('phone') raw: string,
    @ZodBody(sends.template.body) input: RouteInputOf<typeof sends.template>['body'],
    @CurrentUser() user: AuthUser,
  ): Promise<MessageView> {
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
