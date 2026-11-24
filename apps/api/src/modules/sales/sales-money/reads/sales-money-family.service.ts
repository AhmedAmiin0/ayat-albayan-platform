import type { SalesFamilyView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { renewsAny, SalesMoneyScope } from '@/modules/sales/sales-money/shared';
import { SalesMoneyReads } from './sales-money.reads';

/** Her students of this chat's family, as SalesMoneyReads lists them. */
@Injectable()
export class SalesMoneyFamily {
  // Explicit tokens keep these classes value imports, so Nest DI can still resolve them.
  constructor(
    @Inject(SalesMoneyScope) private readonly scope: SalesMoneyScope,
    @Inject(SalesMoneyReads) private readonly reads: SalesMoneyReads,
  ) {}

  /** Every child with sales.renew_any; else hers while SalesOwnershipRule enforces ownership. */
  async familyOf(phone: string, user: AuthUser): Promise<SalesFamilyView> {
    const own = await this.scope.ownership(user);
    return this.reads.familyOf(phone, { own, all: renewsAny(user) });
  }
}
