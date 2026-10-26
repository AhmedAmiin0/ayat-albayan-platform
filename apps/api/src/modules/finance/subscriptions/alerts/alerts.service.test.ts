import { describe, expect, it, vi } from 'vitest';
import { readerOf } from '../../../../common/settings/settings.fakes';
import type { AlertsQueries } from './alerts.queries';
import { SubscriptionAlertsService, type AlertsEnv } from './alerts.service';
import type { PackagesService, StudentState } from '../money/packages.service';
import { SubscriptionsSettings } from '../subscriptions.settings';

const NOW = new Date('2026-10-02T09:00:00Z');
const RECIPIENT = { studentName: 'سهيلة', guardianId: 'g1', phone: '+966500000001' };

function state(status: 'active' | 'unpaid' | 'paused', used: number, total = 4): StudentState {
  const row = { id: 'sub-1', status, price: 145, lessons_total: total, student_id: 's1' };
  const balance = { subscription_id: 'sub-1', lessons_used: used, remaining: total - used };
  return { rows: [row], ctx: { balances: new Map([['sub-1', balance]]), paid: new Map() } } as unknown as StudentState;
}

function setup(states: Record<string, StudentState | Error>, auto = true) {
  const packages = {
    recompute: vi.fn(async (id: string) => {
      const s = states[id];
      if (s instanceof Error) throw s;
      return s ?? { rows: [], ctx: { balances: new Map(), paid: new Map() } };
    }),
  };
  const queries = {
    studentsOfLessons: vi.fn(async () => ['s1']),
    raiseTask: vi.fn(async () => undefined),
    recipient: vi.fn(async () => RECIPIENT),
    queueRenewal: vi.fn(async () => undefined),
    closeTasks: vi.fn(async () => undefined),
  };
  const settings = readerOf(SubscriptionsSettings, { auto_messages_enabled: auto });
  const push = { notifyAdmins: vi.fn(async () => undefined) };
  const renewal = { apply: vi.fn(async () => null) };
  const service = new SubscriptionAlertsService(
    packages as unknown as PackagesService,
    queries as unknown as AlertsQueries,
    { settings, push, renewal } as unknown as AlertsEnv,
  );
  return { service, packages, queries, push, renewal };
}

describe('SubscriptionAlertsService (R-SUB-02)', () => {
  it('2 left → renewal_due task + a queued renewal_due message, same dedup key', async () => {
    const { service, queries } = setup({ s1: state('active', 2) });
    await service.evaluateStudents(['s1'], { now: NOW });
    expect(queries.raiseTask).toHaveBeenCalledWith({
      kind: 'renewal_due',
      subjectId: 'sub-1',
      dedupKey: 'renewal_due:sub-1',
      title: 'بقيت حلقتان',
    });
    expect(queries.queueRenewal).toHaveBeenCalledWith({
      recipient: RECIPIENT,
      params: { '1': 'سهيلة', '2': 'بقيت حلقتان' },
      dedupKey: 'renewal_due:sub-1',
      now: NOW,
    });
  });

  it('used up → subscription_unpaid task; the renewal reminder under its own key (sent once even if 2 left was skipped)', async () => {
    const { service, queries } = setup({ s1: state('unpaid', 4) });
    await service.evaluateStudents(['s1'], { now: NOW });
    expect(queries.raiseTask).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'subscription_unpaid', title: 'انتهت الباقة' }),
    );
    expect(queries.queueRenewal).toHaveBeenCalledWith(expect.objectContaining({ dedupKey: 'renewal_due:sub-1' }));
    expect(queries.closeTasks).toHaveBeenCalledWith({
      subjectIds: ['sub-1'],
      keep: ['renewal_due:sub-1', 'subscription_unpaid:sub-1'],
      now: NOW,
    });
  });

  it('payment_due push only when the task is newly raised (R-MOB-01)', async () => {
    const { service, queries, push } = setup({ s1: state('active', 2) });
    await service.evaluateStudents(['s1'], { now: NOW });
    expect(push.notifyAdmins).not.toHaveBeenCalled(); // raiseTask: already open
    queries.raiseTask.mockResolvedValueOnce(true as never);
    await service.evaluateStudents(['s1'], { now: NOW });
    expect(push.notifyAdmins).toHaveBeenCalledWith('payment_due', {
      subject: 'renewal_due:sub-1',
      vars: { student: 'سهيلة', left: 'بقيت حلقتان' },
      data: { subscriptionId: 'sub-1', studentId: 's1' },
    });
  });

  it('automatic messages OFF: the task and the payment_due push still happen, no renewal_due is queued', async () => {
    const { service, queries, push } = setup({ s1: state('active', 2) }, false);
    queries.raiseTask.mockResolvedValueOnce(true as never);
    await service.evaluateStudents(['s1'], { now: NOW });
    expect(queries.raiseTask).toHaveBeenCalledWith(expect.objectContaining({ kind: 'renewal_due', dedupKey: 'renewal_due:sub-1' }));
    expect(push.notifyAdmins).toHaveBeenCalledWith('payment_due', expect.objectContaining({ subject: 'renewal_due:sub-1' }));
    expect(queries.queueRenewal).not.toHaveBeenCalled();
    expect(queries.closeTasks).toHaveBeenCalledWith(expect.objectContaining({ subjectIds: ['sub-1'] }));
  });

  it('3 left or a paused package → nothing raised, and their open tasks are closed', async () => {
    const { service, queries } = setup({ s1: state('active', 1), s2: state('paused', 4) });
    await service.evaluateStudents(['s1', 's2'], { now: NOW });
    expect(queries.raiseTask).not.toHaveBeenCalled();
    expect(queries.closeTasks).toHaveBeenCalledWith({ subjectIds: ['sub-1'], keep: [], now: NOW });
    expect(queries.closeTasks).toHaveBeenCalledTimes(2);
  });

  it('a deleted package: all its open tasks are closed', async () => {
    const { service, queries } = setup({});
    await service.closeTasksOf('sub-9', NOW);
    expect(queries.closeTasks).toHaveBeenCalledWith({ subjectIds: ['sub-9'], keep: [], now: NOW });
  });

  it('no guardian on file → the task is still raised, no message', async () => {
    const { service, queries } = setup({ s1: state('active', 3) });
    queries.recipient.mockResolvedValueOnce(null as never);
    await service.evaluateStudents(['s1']);
    expect(queries.raiseTask).toHaveBeenCalledOnce();
    expect(queries.queueRenewal).not.toHaveBeenCalled();
  });

  it('one failing student never stops the others; returns the failures', async () => {
    const { service, queries } = setup({ s1: new Error('boom'), s2: state('active', 2) });
    expect(await service.evaluateStudents(['s1', 's2'])).toBe(1);
    expect(queries.raiseTask).toHaveBeenCalledOnce();
  });

  it('each student once, recomputed as the actor', async () => {
    const { service, packages } = setup({ s1: state('active', 0) });
    await service.evaluateStudents(['s1', 's1'], { actorId: 'admin-1' });
    expect(packages.recompute).toHaveBeenCalledTimes(1);
    expect(packages.recompute).toHaveBeenCalledWith('s1', 'admin-1');
  });

  it('a lesson change evaluates the lesson students', async () => {
    const { service, queries, packages } = setup({ s1: state('active', 0) });
    await service.evaluateLessons(['l1']);
    expect(queries.studentsOfLessons).toHaveBeenCalledWith(['l1']);
    expect(packages.recompute).toHaveBeenCalledWith('s1', null);
  });

  it('no students → no settings read', async () => {
    const { service } = setup({});
    expect(await service.evaluateStudents([])).toBe(0);
  });
});
