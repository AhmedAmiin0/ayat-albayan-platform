import { threadForwardRoutes as routes, type ForwardResponse, type ForwardResult } from '@ab/shared';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '@/common/audit/audit.service';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import type { SalesScope } from '@/modules/sales/sales';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import type { TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { ThreadForwardService, type ForwardOutcome } from './thread-forward.service';

/** What the audit row keeps: who got the copy (its id) and who was skipped (why). */
export function forwardAudit(results: readonly ForwardOutcome[]) {
  return {
    sent: results.flatMap((r) => (r.sent ? [{ phone: r.phone, message_id: r.message_id }] : [])),
    skipped: results.flatMap((r) => (r.sent ? [] : [{ phone: r.phone, reason: r.reason }])),
  };
}

/** The answer leaves out the internal `replayed` flag. */
const publicResult = (r: ForwardOutcome): ForwardResult =>
  r.sent
    ? { phone: r.phone, sent: true, message_id: r.message_id }
    : { phone: r.phone, sent: false, reason: r.reason };

/** What this request newly did: a copy that already existed (a retry) was audited the first time. */
export const freshResults = (results: readonly ForwardOutcome[]): ForwardOutcome[] =>
  results.filter((r) => !(r.sent && r.replayed === true));

/** A retried forward whose every copy already existed was audited the first time. */
export const allReplayed = (results: readonly ForwardOutcome[]): boolean =>
  freshResults(results).length === 0;

/** Who forwarded: a salesperson's id, a teacher's id and name, or nothing for staff. */
function forwardedBy(sales: SalesScope | null, scope: TeacherScope | null): object {
  const teacher = scope ? { teacher_id: scope.teacherId, teacher_name: scope.teacherName } : {};
  return sales ? { sales_id: sales.salesId } : teacher;
}

interface Forwarded {
  user: AuthUser;
  source: { id: string; phone_e164: string; media_mime: string | null };
  results: readonly ForwardOutcome[];
  by: object;
}

/** Copies one message to 1-5 chats via the send path; audited once per forward. */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller()
export class ThreadForwardController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly forwards: ThreadForwardService,
    private readonly audit: AuditService,
  ) {}

  @Route(routes.forward)
  @HttpCode(201)
  @Permissions('inbox.send')
  async forward(
    @RouteInput() { body }: RouteInputOf<typeof routes.forward>,
    @CurrentUser() user: AuthUser,
  ): Promise<ForwardResponse> {
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    const forwarded = await this.forwards.forward({ input: body, actorId: user.id, scope, sales });
    const { source, results } = forwarded;
    await this.record({ user, source, results, by: forwardedBy(sales, scope) });
    return { results: results.map(publicResult) };
  }

  private async record({ user, source, results, by }: Forwarded): Promise<void> {
    if (allReplayed(results)) return;
    await this.audit.record({
      actorId: user.id,
      entity: 'messages',
      entityId: source.id,
      action: 'thread_forward',
      before: null,
      after: {
        from_phone: source.phone_e164,
        media_mime: source.media_mime,
        ...forwardAudit(freshResults(results)),
        ...by,
      },
    });
  }
}
