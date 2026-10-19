import type { MessageView } from '@ab/shared';
import type { AuditService } from '../../common/audit/audit.service';
import type { AuthUser } from '../../common/auth/verify-token';
import type { SalesScope } from '../sales/sales-scope';
import type { Sent } from './outbox';
import type { TeacherScope } from './teacher-scope';

export interface SendAudit {
  sent: Sent;
  action: string;
  user: AuthUser;
  scope: TeacherScope | null;
  sales: SalesScope | null;
  /** A sent file (owner 2026-10-19 #2): logged in place of template_key. */
  media?: { media_mime: string | null; media_name: string };
}

/**
 * Every inbox send is audited under who sent it; a teacher's send names them too (every message
 * a teacher sends is logged), a salesperson's carries her id. A replayed request id returns the
 * first row: that send was audited already.
 */
export async function recordSend(audit: AuditService, input: SendAudit): Promise<MessageView> {
  const { sent, scope, sales } = input;
  const { view } = sent;
  if (sent.replayed) return view;
  const teacher = scope ? { teacher_id: scope.teacherId, teacher_name: scope.teacherName } : {};
  const by = sales ? { sales_id: sales.salesId } : teacher;
  const what = input.media ?? { template_key: view.template_key };
  await audit.record({
    actorId: input.user.id,
    entity: 'messages',
    entityId: view.id,
    action: input.action,
    before: null,
    after: { phone: view.phone_e164, ...what, status: view.status, ...by },
  });
  return view;
}
