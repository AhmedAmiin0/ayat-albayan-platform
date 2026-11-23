import { describe, expect, it } from 'vitest';
import { fakeDb, type FakeResult } from '@/common/db/testing/fake-db';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { AssistantPaySettings } from '@/modules/finance/assistant-pay/shared/assistant-pay.settings';
import { TermsRepo } from './terms.repo';

interface Call { table: string; method: string; args: unknown[] }
const on = (calls: Call[], table: string) => (method: string) =>
  calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);

const setup = (results: Record<string, FakeResult[]>) => {
  const fake = fakeDb(results);
  const repo = new TermsRepo(fake.db, new AssistantPaySettings(fakeSettings()));
  return { ...fake, repo };
};

describe('TermsRepo.uncommissioned shape', () => {
  it('students brought, then commissions and priced packages in parallel: three trips', async () => {
    const { repo, calls, trips } = setup({
      students: [{ data: [{ id: 's1' }, { id: 's2' }] }],
      assistant_commissions: [{ data: [{ subscription_id: 'u1' }] }],
      subscriptions: [{ data: [{ id: 'u0' }, { id: 'u1' }, { id: 'u2' }] }],
    });
    expect(await repo.uncommissioned('a1')).toEqual(['u0', 'u2']);
    expect(on(calls, 'students')('select')).toEqual([['id']]);
    expect(on(calls, 'students')('eq')).toEqual([['brought_by', 'a1']]);
    const com = on(calls, 'assistant_commissions');
    expect(com('select')).toEqual([['subscription_id']]);
    expect(com('in')).toEqual([['student_id', ['s1', 's2']]]);
    const sub = on(calls, 'subscriptions');
    expect(sub('select')).toEqual([['id']]);
    expect(sub('in')).toEqual([['student_id', ['s1', 's2']]]);
    expect(sub('gt')).toEqual([['price', 0]]);
    expect(sub('or')).toEqual([['status.neq.cancelled,cancel_kind.eq.stopped']]);
    expect(sub('order')).toEqual([['created_at'], ['id']]);
    expect([...sub('limit'), ...sub('range'), ...on(calls, 'students')('range')]).toEqual([]);
    expect(trips).toEqual(['students', 'assistant_commissions', 'subscriptions']);
  });

  it('nobody brought: empty, no further trip', async () => {
    const { repo, trips } = setup({ students: [{ data: [] }] });
    expect(await repo.uncommissioned('a1')).toEqual([]);
    expect(trips).toEqual(['students']);
  });

  const boom = { error: { message: 'boom' } };
  const failures: [string, Record<string, FakeResult[]>][] = [
    ['students', { students: [boom] }],
    [
      'assistant_commissions',
      {
        students: [{ data: [{ id: 's1' }] }],
        assistant_commissions: [boom],
        subscriptions: [{ data: [] }],
      },
    ],
    [
      'subscriptions',
      {
        students: [{ data: [{ id: 's1' }] }],
        assistant_commissions: [{ data: [] }],
        subscriptions: [boom],
      },
    ],
  ];
  it.each(failures)('a failed %s read is thrown', async (_t, results) => {
    const { repo } = setup(results);
    await expect(repo.uncommissioned('a1')).rejects.toThrow('boom');
  });
});
