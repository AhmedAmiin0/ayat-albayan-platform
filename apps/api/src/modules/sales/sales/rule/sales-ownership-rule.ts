import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';
import { SalesRepo, SalesSettings } from '@/modules/sales/sales/shared';

/** The two academy switches the rule reads. */
interface OwnershipSwitches {
  sales_require_assignee: boolean;
  sales_auto_assign: boolean;
}

/** Enforced only while sales_require_assignee and auto-assignment are both on. */
export const enforcesOwnership = (s: OwnershipSwitches): boolean =>
  s.sales_require_assignee && s.sales_auto_assign;

/**
 * What every assistant ownership check reads: her ownership while the rule enforces it, null
 * otherwise (no ownership check: never NO_OWNERSHIP, which owns nothing and blocks everyone).
 */
@Injectable()
export class SalesOwnershipRule {
  constructor(
    private readonly settings: SalesSettings,
    private readonly sales: SalesRepo,
  ) {}

  async enforced(): Promise<boolean> {
    return enforcesOwnership(await this.settings.read());
  }

  async scope(user: AuthUser): Promise<SalesOwnership | null> {
    return (await this.enforced()) ? this.sales.ownership(user.id) : null;
  }
}
