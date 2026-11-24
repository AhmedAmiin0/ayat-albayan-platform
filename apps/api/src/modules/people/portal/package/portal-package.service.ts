import { PACKAGE_GUARDIAN_ONLY, type PortalPackageView } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { forbidden } from '@/common/http/errors';
import { PackagesService } from '@/modules/finance/subscriptions';
import { PortalSettings } from '@/modules/people/portal/portal.settings';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';
import { readsMoney, toPortalPackageView } from './portal-package.mapper';
import { PortalPackageRepo } from './portal-package.repo';

/** docs/31, docs/50 §5: a child's own login gets 403 package_guardian_only. */
@Injectable()
export class PortalPackageService {
  constructor(
    @Inject(PortalScopes) private readonly scopes: PortalScopes,
    @Inject(PortalPackageRepo) private readonly queries: PortalPackageRepo,
    @Inject(PackagesService) private readonly packages: PackagesService,
    @Inject(PortalSettings) private readonly settings: PortalSettings,
  ) {}

  async current(input: { user: AuthUser; studentId: string }): Promise<PortalPackageView> {
    const student = await this.scopes.student(input.user, input.studentId);
    if (!readsMoney(input.user.role, student)) throw forbidden(PACKAGE_GUARDIAN_ONLY);
    const [balance, payments, values] = await Promise.all([
      this.packages.studentBalance(input.studentId),
      this.queries.payments(input.studentId),
      this.settings.read(),
    ]);
    const instructions = values.family_payment_instructions;
    return toPortalPackageView({ balance, payments, instructions });
  }
}
