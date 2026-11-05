// The money harness plus the start-date edit's repo as a mock (test-only, excluded from the build).
import { daysBefore, riyadhToday, type Permission } from '@ab/shared';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { vi } from 'vitest';
import type { PermissionResolver } from '@/common/auth/permissions';
import { systemResolver } from '@/common/auth/auth.guard';
import { SUB_ID } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp } from '@/modules/finance/subscriptions/test-app';
import { StartDateEditRepo } from './start-date-edit.repo';

export const URL = `/subscriptions/${SUB_ID}/start-date`;

/** Today (Asia/Riyadh) moved by n days, YYYY-MM-DD. */
export const dayFromToday = (n: number): string => daysBefore(riyadhToday(), -n);

/** «مساعد خاص»: salesA = the system sales role plus subscriptions.edit_terms; salesB not. */
const withEditTerms: PermissionResolver = async (user) => {
  const special: readonly Permission[] = user.id.startsWith('a1') ? ['subscriptions.edit_terms'] : [];
  return [...(await systemResolver(user)), ...special];
};

export async function startDateApp(resolver: PermissionResolver = withEditTerms) {
  const edits = { setStartsOn: vi.fn() };
  const withEdits = (b: TestingModuleBuilder) =>
    b.overrideProvider(StartDateEditRepo).useValue(edits);
  const app = await moneyApp(resolver, withEdits);
  return { ...app, edits };
}
