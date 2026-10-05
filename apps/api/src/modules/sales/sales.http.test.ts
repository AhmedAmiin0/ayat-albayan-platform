import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { A, dirtySubscription, meetingRow, NONE, OWN_A, salesApp } from './sales.fakes';

type App = Awaited<ReturnType<typeof salesApp>>;
const RANGE = 'from=2026-10-01T00:00:00Z&to=2026-10-31T00:00:00Z';
const MONEY = /price|currency|fx_|notes|payment|amount|paid|due/i;
const keys = (v: unknown): string[] =>
  v && typeof v === 'object' ? Object.entries(v).flatMap(([k, x]) => [k, ...keys(x)]) : [];

describe('GET /sales/subscriptions and /sales/meetings (sales portal)', () => {
  let t: App;
  beforeAll(async () => {
    t = await salesApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.sales.ownership.mockImplementation(async (id: string) => (id === A ? OWN_A : NONE));
    t.sales.subscriptions.mockImplementation(async (q: { studentIds: string[] }) => (q.studentIds.includes('s1') ? [dirtySubscription()] : []));
    t.sales.meetings.mockImplementation(async (q: { own: typeof OWN_A }) => (q.own.leadIds.includes('l1') ? [meetingRow()] : []));
  });

  it('pending = trial | unpaid | paused, confirmed = active; rows are exactly id, student, package, status, starts_on, lessons_total', async () => {
    const res = await t.call({ method: 'GET', url: '/sales/subscriptions?kind=pending', token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(t.sales.subscriptions).toHaveBeenCalledWith({ studentIds: ['s1'], statuses: ['trial', 'unpaid', 'paused'] });
    expect(res.json()).toEqual([
      { id: 'sub-1', student: { id: 's1', code: 'AB-0101', name: 'ياسمين' }, package: '8', status: 'unpaid', starts_on: '2026-10-01', lessons_total: 8 },
    ]);
    await t.call({ method: 'GET', url: '/sales/subscriptions?kind=confirmed', token: 'salesA' });
    expect(t.sales.subscriptions).toHaveBeenLastCalledWith({ studentIds: ['s1'], statuses: ['active'] });
  });

  it('no money key anywhere in the payload, even when the row carries them', async () => {
    for (const kind of ['pending', 'confirmed']) {
      const res = await t.call({ method: 'GET', url: `/sales/subscriptions?kind=${kind}`, token: 'salesA' });
      expect(keys(res.json()).filter((k) => MONEY.test(k))).toEqual([]);
      expect(res.body).not.toContain('290');
    }
  });

  it('sales B sees none of A: empty subscriptions and meetings', async () => {
    expect((await t.call({ method: 'GET', url: '/sales/subscriptions?kind=pending', token: 'salesB' })).json()).toEqual([]);
    expect((await t.call({ method: 'GET', url: `/sales/meetings?${RANGE}`, token: 'salesB' })).json()).toEqual([]);
  });

  it('meetings: the trial lessons of my leads with the joinable window', async () => {
    const res = await t.call({ method: 'GET', url: `/sales/meetings?${RANGE}`, token: 'salesA' });
    expect(res.statusCode).toBe(200);
    expect(t.sales.meetings).toHaveBeenCalledWith({ own: OWN_A, from: '2026-10-01T00:00:00Z', to: '2026-10-31T00:00:00Z' });
    const [m] = res.json();
    expect(m).toMatchObject({
      lesson_id: 'les-1', status: 'scheduled', teacher_name: 'أبرار', lead_or_student_name: 'أم ياسمين',
      joinable_window: { opens_at: '2026-10-05T15:45:00.000Z', closes_at: '2026-10-05T18:30:00.000Z' },
    });
    expect(['early', 'open', 'closed']).toContain(m.joinable_window.state);
  });

  it('validation: kind required, range at most 31 days, instants only', async () => {
    const bad = ['/sales/subscriptions', '/sales/subscriptions?kind=all', '/sales/meetings', '/sales/meetings?from=2026-10-01T00:00:00Z&to=2026-11-05T00:00:00Z', '/sales/meetings?from=x&to=y'];
    for (const url of bad) expect((await t.call({ method: 'GET', url, token: 'salesA' })).statusCode).toBe(400);
  });

  it('only a salesperson: admin and teacher get 403', async () => {
    for (const token of ['admin', 'teacher'] as const) {
      expect((await t.call({ method: 'GET', url: '/sales/subscriptions?kind=pending', token })).statusCode).toBe(403);
      expect((await t.call({ method: 'GET', url: `/sales/meetings?${RANGE}`, token })).statusCode).toBe(403);
    }
  });
});
