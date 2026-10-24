import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { RouteQueries } from './route.queries';
import { templateRow } from './whatsapp.fakes';

// docs/23c decision 4: approvals per number, and the templates sendable on the role's WABA or on some number.

describe('RouteQueries', () => {
  it('approvals: every message_template_numbers row as key → number → status', async () => {
    const rows = [
      { template_key: 'a', number_id: 'n1', status: 'approved' },
      { template_key: 'a', number_id: 'n2', status: 'pending' },
      { template_key: 'b', number_id: 'n1', status: 'rejected' },
    ];
    const { db, calls } = fakeDb({ message_template_numbers: [{ data: rows }] });
    const out = await new RouteQueries(db).approvals();
    expect([...(out.get('a') ?? [])]).toEqual([['n1', 'approved'], ['n2', 'pending']]);
    expect(out.get('b')?.get('n1')).toBe('rejected');
    expect(calls.find((c) => c.method === 'select')?.args).toEqual(['template_key, number_id, status']);
  });

  it('templates: approved on the registry OR approved on some number (malformed keys never filtered on)', async () => {
    const { db, calls } = fakeDb({ message_templates: [{ data: [templateRow()] }] });
    const approvals = new Map([
      ['renewal_due', new Map([['n1', 'approved']])],
      ['lesson_rating', new Map([['n1', 'pending']])],
      ['bad,key', new Map([['n1', 'approved']])],
    ]);
    await expect(new RouteQueries(db).templates(approvals)).resolves.toEqual([templateRow()]);
    expect(calls.find((c) => c.method === 'or')?.args).toEqual(['status.eq.approved,key.in.(renewal_due)']);
  });

  it('a failed read throws (the pass sends nothing)', async () => {
    const { db } = fakeDb({ message_template_numbers: [{ error: { message: 'down' } }] });
    await expect(new RouteQueries(db).approvals()).rejects.toThrow('template approvals read failed');
  });
});
