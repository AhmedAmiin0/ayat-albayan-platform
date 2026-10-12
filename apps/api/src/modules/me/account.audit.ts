import type { AuditService } from '../../common/audit/audit.service';

/** What the user changed on their own account (R-ACC-02..05); 'wrong_password' = a refused check. */
export type AccountAction = 'profile_update' | 'email_change' | 'password_change' | 'avatar_set' | 'avatar_remove' | 'wrong_password';

export interface AccountAuditEntry {
  userId: string;
  action: AccountAction;
  /** Field NAMES only (full_name, phone_e164, email, password, avatar): never a value. */
  fields: readonly string[];
}

/** audit_log row of a self-service change; like users.audit.ts, it never holds a secret or a value. */
export async function recordAccount(audit: Pick<AuditService, 'record'>, e: AccountAuditEntry): Promise<void> {
  await audit.record({
    actorId: e.userId,
    entity: 'profiles',
    entityId: e.userId,
    action: `account.${e.action}`,
    before: null,
    after: { fields: [...e.fields] },
  });
}
