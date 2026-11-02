// Test-only: a SalesOwnershipRule over a fake SalesRepo and fake settings (not built).
import type { AcademySettings } from '@ab/shared';
import { vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { SalesOwnership } from '@/modules/sales/sales/sales-ownership';
import type { SalesRepo } from '@/modules/sales/sales/sales.repo';
import { SalesSettings } from '@/modules/sales/sales/sales.settings';
import { SalesOwnershipRule } from './sales-ownership-rule';

/** Both switches ON: the rule enforces her ownership (owner 2026-11-02). */
export const REQUIRE_ON = { sales_require_assignee: true, sales_auto_assign: true } as const;

/** The rule with `own` as her ownership and the given switches (defaults: not enforced). */
export function ruleWith(own: SalesOwnership, over: Partial<AcademySettings> = {}) {
  const sales = { ownership: vi.fn(async (_id: string): Promise<SalesOwnership> => own) };
  const rule = new SalesOwnershipRule(readerOf(SalesSettings, over), sales as unknown as SalesRepo);
  return { sales, rule };
}
