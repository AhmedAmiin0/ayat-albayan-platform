import { studentRemaining, type PortalPackageView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { BalanceQueries } from '../../../finance/subscriptions';
import { PortalScopes } from '../scope/portal-scope';
import { PortalPackageQueries } from './portal-package.queries';

/**
 * «الباقة» (docs/31): the current package (the newest, as alerts and the admin's balance read it), the
 * lessons left over all packages (studentRemaining, same number as the admin's «المتبقي») and the renewal
 * date. Never a price, payment or invoice.
 */
@Injectable()
export class PortalPackageService {
  constructor(
    private readonly scopes: PortalScopes,
    private readonly queries: PortalPackageQueries,
    private readonly balances: BalanceQueries,
  ) {}

  async current(input: { user: AuthUser; studentId: string }): Promise<PortalPackageView> {
    await this.scopes.student(input.user, input.studentId);
    const rows = await this.queries.packages(input.studentId);
    const last = rows.at(-1);
    if (!last) return { package: null };
    const remaining = studentRemaining(await this.balances.forStudents([input.studentId]));
    return {
      package: {
        package: last.package,
        duration: last.duration,
        lessons_total: last.lessons_total,
        remaining,
        starts_on: last.starts_on,
        renews_on: last.renews_on,
        status: last.status,
      },
    };
  }
}
