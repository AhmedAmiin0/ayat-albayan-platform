import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';
import { SalesRepo } from '@/modules/sales/sales/sales.repo';
import { SalesSettings } from '@/modules/sales/sales/sales.settings';

/** The two academy switches the rule reads. */
interface OwnershipSwitches {
  sales_require_assignee: boolean;
  sales_auto_assign: boolean;
}

/**
 * THE assistant ownership rule (owner 2026-11-02): her leads, families and students are
 * checked ONLY while «اشتراط التعيين» (sales_require_assignee) AND the auto-assignment are
 * both ON. Otherwise she acts on ANY lead, family or student (trials, subscriptions, renewals,
 * receipts, a link's teacher, trial dates, course changes). Role permissions, commission and
 * chat visibility never read it.
 */
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
