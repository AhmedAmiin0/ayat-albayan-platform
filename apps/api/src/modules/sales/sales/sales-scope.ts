import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { isSales } from '@/common/auth/roles';

/**
 * A signed-in salesperson in the inbox. Sales play two roles, sales and assistant:
 * she sees and answers EVERY chat, so the scope no longer lists phones; it names who sends
 * (dedup key, audit `sales_id`) and switches the inbox to the sales redactions (sales-threads.ts:
 * no money flag, no packages, no signed links). Ownership (leads, brought_by) is SalesOwnership.
 */
export interface SalesScope {
  salesId: string;
}

/**
 * Resolves a salesperson's scope; null for everyone else (rule 9: from the login, never a param).
 */
@Injectable()
export class SalesScopes {
  of(user: AuthUser): Promise<SalesScope | null> {
    return Promise.resolve(isSales(user) ? { salesId: user.id } : null);
  }
}
