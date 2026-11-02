import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { PermissionCache } from '@/common/auth/permission.cache';
import { recordUser, type UserAuditEntry } from './users.audit';

/** What follows a change to a login: cached permissions forgotten, its audit_log row written. */
@Injectable()
export class UserJournal {
  constructor(
    private readonly cache: PermissionCache,
    private readonly audit: AuditService,
  ) {}

  /** Every guard re-reads roles and permissions on the next request. */
  forget(): void {
    this.cache.clear();
  }

  record(entry: UserAuditEntry): Promise<void> {
    return recordUser(this.audit, entry);
  }
}
