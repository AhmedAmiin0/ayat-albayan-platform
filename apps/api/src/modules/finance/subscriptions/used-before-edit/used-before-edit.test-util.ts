// The money harness plus the edit's own repo as a mock (test-only, excluded from the build).
import type { TestingModuleBuilder } from '@nestjs/testing';
import { vi } from 'vitest';
import type { PermissionResolver } from '@/common/auth/permissions';
import { systemResolver } from '@/common/auth/auth.guard';
import { SUB_ID, STUDENT_ID } from '@/modules/finance/subscriptions/money/money.fakes';
import { moneyApp } from '@/modules/finance/subscriptions/test-app';
import type { BalanceRow } from '@/modules/finance/subscriptions/money/balance.repo';
import { UsedBeforeEditRepo } from './used-before-edit.repo';

export const URL = `/subscriptions/${SUB_ID}/lessons-used-before`;

/** The weekly package (4 lessons) after `used` lessons, lessons_used_before in. */
export function balanceOf(used: number): Map<string, BalanceRow> {
  const row: BalanceRow = {
    subscription_id: SUB_ID,
    student_id: STUDENT_ID,
    lessons_total: 4,
    lessons_used: used,
    remaining: 4 - used,
    is_last: true,
    ended_at: null,
    projected_end_at: null,
  };
  return new Map([[SUB_ID, row]]);
}

export async function editApp(resolver: PermissionResolver = systemResolver) {
  const edits = { courseBooked: vi.fn(), setUsedBefore: vi.fn() };
  const withEdits = (b: TestingModuleBuilder) =>
    b.overrideProvider(UsedBeforeEditRepo).useValue(edits);
  const app = await moneyApp(resolver, withEdits);
  return { ...app, edits };
}
