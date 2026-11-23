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

describe('TermsRepo people reads', () => {
  it('assistants: id and name of role sales, sorted by Arabic name then id', async () => {
    const rows = [
      { id: 'b', full_name: 'هالة' },
      { id: 'c', full_name: 'أحمد' },
      { id: 'a', full_name: 'هالة' },
    ];
    const { repo, calls, trips } = setup({ profiles: [{ data: rows }] });
    expect((await repo.assistants()).map((r) => r.id)).toEqual(['c', 'a', 'b']);
    const p = on(calls, 'profiles');
    expect(p('select')).toEqual([['id, full_name']]);
    expect(p('eq')).toEqual([['role', 'sales']]);
    expect([...p('order'), ...p('limit'), ...p('range')]).toEqual([]);
    expect(trips).toEqual(['profiles']);
  });

  it('isAssistant: eq id and role sales, maybeSingle; no row is false', async () => {
    const { repo, calls, trips } = setup({ profiles: [{ data: { id: 'a1' } }, { data: null }] });
    expect(await repo.isAssistant('a1')).toBe(true);
    expect(await repo.isAssistant('t1')).toBe(false);
    const p = on(calls, 'profiles');
    expect(p('select')[0]).toEqual(['id']);
    expect(p('eq').slice(0, 2)).toEqual([['id', 'a1'], ['role', 'sales']]);
    expect(p('maybeSingle')).toHaveLength(2);
    expect(trips).toEqual(['profiles', 'profiles']);
  });
});

describe('TermsRepo.broughtBy shape', () => {
  it('the student, then the name of who brought them: two trips', async () => {
    const student = { brought_by: 'a1', brought_at: '2026-01-01' };
    const { repo, calls, trips } = setup({
      students: [{ data: student }],
      profiles: [{ data: { full_name: 'منى' } }],
    });
    expect(await repo.broughtBy('s1')).toEqual({ ...student, name: 'منى' });
    expect(on(calls, 'students')('select')).toEqual([['brought_by, brought_at']]);
    expect(on(calls, 'students')('eq')).toEqual([['id', 's1']]);
    expect(on(calls, 'profiles')('select')).toEqual([['full_name']]);
    expect(on(calls, 'profiles')('eq')).toEqual([['id', 'a1']]);
    expect(trips).toEqual(['students', 'profiles']);
  });

  it('nobody brought them: name null, the profile is not read', async () => {
    const student = { brought_by: null, brought_at: null };
    const { repo, trips } = setup({ students: [{ data: student }] });
    expect(await repo.broughtBy('s1')).toEqual({ ...student, name: null });
    expect(trips).toEqual(['students']);
  });

  it('a missing student is null; a missing profile is name null', async () => {
    const student = { brought_by: 'a1', brought_at: null };
    const { repo } = setup({ students: [{ data: null }, { data: student }], profiles: [{}] });
    expect(await repo.broughtBy('x')).toBeNull();
    expect(await repo.broughtBy('s1')).toEqual({ ...student, name: null });
  });

  it('a failed profile read is thrown', async () => {
    const { repo } = setup({
      students: [{ data: { brought_by: 'a1', brought_at: null } }],
      profiles: [{ error: { message: 'boom' } }],
    });
    await expect(repo.broughtBy('s1')).rejects.toThrow('boom');
  });
});

describe('TermsRepo terms rows', () => {
  it('all: select * on assistant_terms, no filter, one trip', async () => {
    const { repo, calls, trips } = setup({ assistant_terms: [{ data: [{ assistant_id: 'a1' }] }] });
    expect(await repo.all()).toEqual([{ assistant_id: 'a1' }]);
    expect(calls.map((c) => [c.method, c.args])).toEqual([['select', ['*']]]);
    expect(trips).toEqual(['assistant_terms']);
  });

  it('get: eq assistant_id, maybeSingle, null passes through', async () => {
    const { repo, calls } = setup({ assistant_terms: [{ data: null }] });
    expect(await repo.get('a1')).toBeNull();
    const t = on(calls, 'assistant_terms');
    expect(t('select')).toEqual([['*']]);
    expect(t('eq')).toEqual([['assistant_id', 'a1']]);
    expect(t('maybeSingle')).toEqual([[]]);
  });

  it('db errors are thrown', async () => {
    const error = { code: 'XX000', message: 'boom' };
    const { repo } = setup({ assistant_terms: [{ error }, { error }], profiles: [{ error }] });
    await expect(repo.all()).rejects.toThrow('db error XX000: boom');
    await expect(repo.get('a1')).rejects.toThrow('boom');
    await expect(repo.assistants()).rejects.toThrow('boom');
  });
});
