import { threadForwardSchema, type ForwardResponse, type ForwardResult } from '@ab/shared';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../../../common/audit/audit.service';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { ThreadForwardService, type ForwardOutcome } from './thread-forward.service';
import { ThreadReads } from '../reads/thread-reads';

/** What the audit row keeps: who got the copy (its id) and who was skipped (why). */
export function forwardAudit(results: readonly ForwardOutcome[]) {
  return {
    sent: results.flatMap((r) => (r.sent ? [{ phone: r.phone, message_id: r.message_id }] : [])),
    skipped: results.flatMap((r) => (r.sent ? [] : [{ phone: r.phone, reason: r.reason }])),
  };
}

/** The answer leaves out the internal `replayed` flag. */
const publicResult = (r: ForwardOutcome): ForwardResult =>
  r.sent ? { phone: r.phone, sent: true, message_id: r.message_id } : { phone: r.phone, sent: false, reason: r.reason };

/** What this request newly did: a copy that already existed (a retry) was audited the first time. */
export const freshResults = (results: readonly ForwardOutcome[]): ForwardOutcome[] => results.filter((r) => !(r.sent && r.replayed === true));

/** A retried forward whose every copy already existed was audited the first time. */
export const allReplayed = (results: readonly ForwardOutcome[]): boolean => freshResults(results).length === 0;

/**
 * «إعادة توجيه» (owner 2026-10-25): POST /threads/forward copies one message to 1–5 chats through the
 * session send path and answers per target. Audited once per forward (`thread_forward`, the source
 * message) under the actor, with the salesperson's or teacher's id like every inbox send.
 */
@ApiTags('inbox')
@ApiBearerAuth()
@Permissions('inbox.read')
@Controller('threads')
export class ThreadForwardController {
  constructor(
    private readonly reads: ThreadReads,
    private readonly forwards: ThreadForwardService,
    private readonly audit: AuditService,
  ) {}

  @Post('forward')
  @HttpCode(201)
  @Permissions('inbox.send')
  async forward(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<ForwardResponse> {
    const input = parseOrThrow(threadForwardSchema, body);
    const sales = await this.reads.salesScope(user);
    const scope = sales ? null : await this.reads.scope(user);
    const { source, results } = await this.forwards.forward({ input, actorId: user.id, scope, sales });
    if (!allReplayed(results)) {
      const by = sales ? { sales_id: sales.salesId } : scope ? { teacher_id: scope.teacherId, teacher_name: scope.teacherName } : {};
      await this.audit.record({
        actorId: user.id,
        entity: 'messages',
        entityId: source.id,
        action: 'thread_forward',
        before: null,
        after: { from_phone: source.phone_e164, media_mime: source.media_mime, ...forwardAudit(freshResults(results)), ...by },
      });
    }
    return { results: results.map(publicResult) };
  }
}
