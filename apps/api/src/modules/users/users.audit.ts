import type { Json } from '@ab/db';
import type { AuditService } from '../../common/audit/audit.service';
import { redact } from './users.redact';
import type { UserRow } from './store/users.store';

/** What the audit trail keeps of a login: who they are, never a credential. */
type Fields = Record<string, Json>;

export function snapshot(row: UserRow): Fields {
  return {
    email: row.email,
    full_name: row.full_name,
    phone_e164: row.phone_e164,
    role: row.role,
    role_id: row.role_id,
    disabled_at: row.disabled_at,
    linked: row.linked ? { kind: row.linked.kind, id: row.linked.id } : null,
  };
}

export interface UserAuditEntry {
  actorId: string;
  userId: string;
  action: string;
  before?: UserRow | null;
  after?: UserRow | null;
  extra?: Fields;
}

/** audit_log row for a users.* action; before/after pass through redact() whatever they hold. */
export async function recordUser(audit: Pick<AuditService, 'record'>, e: UserAuditEntry): Promise<void> {
  await audit.record({
    actorId: e.actorId,
    entity: 'users',
    entityId: e.userId,
    action: e.action,
    before: e.before ? redact(snapshot(e.before)) : null,
    after: e.after || e.extra ? redact({ ...(e.after ? snapshot(e.after) : {}), ...e.extra }) : null,
  });
}
