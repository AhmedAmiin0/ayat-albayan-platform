import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import type { AlertsQueries } from './alerts.queries';
import { AlertsJob } from './alerts.job';
import type { SubscriptionAlertsService } from './alerts.service';
import type { BalanceQueries, BalanceRow } from '../money/balance.queries';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { subRow } from '../money/money.fakes';
import type { SubscriptionsQueries } from '../subscriptions.queries';
import { SubscriptionsSettings } from '../subscriptions.settings';
import { UnpaidFlags } from './unpaid-flags.service';

const bal = (id: string, studentId: string, remaining: number): BalanceRow => ({
  subscription_id: id, student_id: studentId, lessons_total: 4, lessons_used: 4 - remaining, remaining,
  is_last: true, ended_at: null, projected_end_at: null,
});

function flags(on: boolean) {
  const rows = [
    subRow({ id: 'a', student_id: 's1', status: 'unpaid' }),
    subRow({ id: 'b', student_id: 's2', status: 'unpaid' }),
    subRow({ id: 'c', student_id: 's3', status: 'active' }),
  ];
  const subs = { forStudents: vi.fn(async () => rows) };
  const balances = { forStudents: vi.fn(async () => [bal('a', 's1', 0), bal('b', 's2', 2), bal('c', 's3', 0)]) };
  const settings = readerOf(SubscriptionsSettings, { flag_future_lessons_when_unpaid: on });
  return new UnpaidFlags(
    subs as unknown as SubscriptionsQueries,
    balances as unknown as BalanceQueries,
    settings,
  );
}

describe('UnpaidFlags (R-SUB-02 «الباقة غير مدفوعة» on future lessons)', () => {
  it('only students whose newest package is unpaid with nothing left', async () => {
    expect(await flags(true).studentIds(['s1', 's2', 's3', 's1'])).toEqual(new Set(['s1']));
  });

  it('the setting off → nobody is flagged', async () => {
    expect(await flags(false).studentIds(['s1'])).toEqual(new Set());
  });

  it('no students → empty', async () => {
    expect(await flags(true).studentIds([])).toEqual(new Set());
  });
});

describe('AlertsJob', () => {
  function job(students: () => Promise<string[]>) {
    const queries = { studentsWithPackages: vi.fn(students) };
    const alerts = { evaluateStudents: vi.fn(async () => 1), evaluateLessons: vi.fn(async () => undefined) };
    const events = new LessonEvents();
    const j = new AlertsJob(queries as unknown as AlertsQueries, alerts as unknown as SubscriptionAlertsService, events);
    return { j, alerts, events };
  }

  it('a lesson change evaluates the lessons right away (report submit, status, cancel)', async () => {
    const { j, alerts, events } = job(async () => []);
    j.onModuleInit();
    await events.changed(['l1']);
    expect(alerts.evaluateLessons).toHaveBeenCalledWith(['l1']);
  });

  it('the sweep evaluates every student with a package; never throws', async () => {
    const now = new Date('2026-10-02T09:00:00Z');
    const ok = job(async () => ['s1', 's2']);
    expect(await ok.j.runOnce(now)).toEqual({ students: 2, failed: 1 });
    expect(ok.alerts.evaluateStudents).toHaveBeenCalledWith(['s1', 's2'], { now, cause: { via: 'sweep' } });
    const broken = job(async () => Promise.reject(new Error('db down')));
    expect(await broken.j.runOnce(now)).toEqual({ students: 0, failed: 0 });
  });

  it('timers are unref’d and cleared', () => {
    const { j } = job(async () => []);
    j.onApplicationBootstrap();
    j.onModuleDestroy();
  });
});
