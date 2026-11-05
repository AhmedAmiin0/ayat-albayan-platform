import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { SalesOwnershipRule } from '@/modules/sales/sales';

/** Who the assistant ownership rule binds: the sales base role; the admin never. */
const isAssistant = (user: AuthUser): boolean => user.role === 'sales';

/**
 * The assistant ownership rule of PR #612 (SalesOwnershipRule) on /people/*: ANY student and family
 * while «اشتراط التعيين» is OFF (the default); only hers while the rule enforces it, 403
 * not_your_student / not_your_family. The admin is never bound.
 */
@Injectable()
export class PeopleOwnership {
  constructor(private readonly rule: SalesOwnershipRule) {}

  async student(user: AuthUser, studentId: string): Promise<void> {
    const own = isAssistant(user) ? await this.rule.scope(user) : null;
    if (own && !own.studentIds.includes(studentId)) throw forbidden('not_your_student');
  }

  async family(user: AuthUser, guardianId: string): Promise<void> {
    const own = isAssistant(user) ? await this.rule.scope(user) : null;
    if (own && !own.guardianIds.includes(guardianId)) throw forbidden('not_your_family');
  }

  /**
   * The family a move resolved to: one this move created is hers by the move; any other (picked,
   * or a «new» one whose number already existed) must be hers while the rule is on.
   */
  async target(user: AuthUser, target: { id: string; created: boolean }): Promise<void> {
    if (target.created) return;
    await this.family(user, target.id);
  }
}
