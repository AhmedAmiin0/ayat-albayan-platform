// Test fixtures for SubscriptionAlertsService (test-only, excluded from the build by *.fakes.ts).
import { vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import type { PackagesService, StudentState } from '@/modules/finance/subscriptions/money/packages.service';
import { SubscriptionsSettings } from '@/modules/finance/subscriptions/shared/subscriptions.settings';
import type { AlertsRepo } from '@/modules/finance/subscriptions/alerts/alerts.repo';
import { SubscriptionAlertsService } from '@/modules/finance/subscriptions/alerts/alerts.service';
import type { AlertsEnv } from '@/modules/finance/subscriptions/alerts/alerts.env';

export const NOW = new Date('2026-10-02T09:00:00Z');
export const RECIPIENT = { studentName: 'سهيلة', guardianId: 'g1', phone: '+966500000001' };
const STUDENT = { status: 'active', tz: 'Asia/Riyadh' };
const OPEN = ['renewal_due', 'subscription_unpaid'].map((kind) => ({
  subject_id: 'sub-1',
  dedup_key: `${kind}:sub-1`,
}));
const CTX = { balances: new Map(), paid: new Map() };
const EMPTY = { rows: [], ctx: CTX } as unknown as StudentState;

type Given = StudentState | Error | undefined;
const isState = (s: Given): s is StudentState => s !== undefined && !(s instanceof Error);
const stateOf = (s: Given): StudentState => (isState(s) ? s : EMPTY);
const byId = <T>(ids: string[], of: (id: string) => T) => new Map(ids.map((id) => [id, of(id)]));

export function state(status: 'active' | 'unpaid' | 'paused', used: number, total = 4): StudentState {
  const row = { id: 'sub-1', status, price: 145, lessons_total: total, student_id: 's1' };
  const balance = { subscription_id: 'sub-1', lessons_used: used, remaining: total - used };
  const ctx = { balances: new Map([['sub-1', balance]]), paid: new Map() };
  return { rows: [row], ctx } as unknown as StudentState;
}

/** An Error for a student makes its renewal step fail (one failing student). */
export function setup(states: Record<string, Given>, auto = true) {
  const failing = new Set(Object.keys(states).filter((id) => states[id] instanceof Error));
  const recompute = async (ids: string[]) => byId(ids, (id) => stateOf(states[id]));
  const packages = { recomputeMany: vi.fn(recompute) };
  const queries = {
    studentsOfLessons: vi.fn(async () => ['s1']),
    raiseTask: vi.fn(async () => undefined),
    recipient: vi.fn(async () => RECIPIENT),
    queueRenewal: vi.fn(async () => undefined),
    closeTasks: vi.fn(async () => undefined),
    openTasks: vi.fn(async () => OPEN),
    closeKeys: vi.fn(async () => undefined),
  };
  const settings = readerOf(SubscriptionsSettings, { auto_messages_enabled: auto });
  const push = { notifyAdmins: vi.fn(async () => undefined) };
  const boom = async () => Promise.reject(new Error('boom'));
  const apply = async (i: { studentId: string }) => (failing.has(i.studentId) ? boom() : null);
  const students = async (ids: string[]) => byId(ids, () => STUDENT);
  const renewal = { apply: vi.fn(apply), students: vi.fn(students) };
  const service = new SubscriptionAlertsService(
    packages as unknown as PackagesService,
    queries as unknown as AlertsRepo,
    { settings, push, renewal } as unknown as AlertsEnv,
  );
  return { service, packages, queries, push, renewal };
}
