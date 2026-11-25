import type { TestingModuleBuilder } from '@nestjs/testing';
import type { PermissionResolver } from '@/common/auth/permissions';
import { featureRoot } from '@/common/infra/test-root';
import { moneyAppOf } from '@/modules/finance/subscriptions/tests/test-app';
import { SalesMoneyModule } from '@/modules/sales/sales-money';

/** moneyApp's mocks, tokens and `call` on SalesMoneyModule and the admin money routes. */
export function salesMoneyApp(
  resolver?: PermissionResolver,
  more?: (b: TestingModuleBuilder) => TestingModuleBuilder,
) {
  return moneyAppOf(featureRoot(SalesMoneyModule), resolver, more);
}
