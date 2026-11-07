import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { relaneQueued } from './relane.repo';

// #695 review, item 2: after «نقل إلى الرقم الآخر» a template's queued, unclaimed rows take its new
// lane stamp; a row in flight (SENDING) or no longer queued is never touched.

const M = 'messages';
interface Call { table: string; method: string; args: unknown[] }
const of = (calls: Call[], method: string) =>
  calls.filter((c) => c.table === M && c.method === method).map((c) => c.args);

describe('relaneQueued', () => {
  it('moved off chat: its chat-stamped queued, unclaimed rows lose the stamp (main lane)', async () => {
    const { db, calls, argsOf } = fakeDb({ [M]: [{ data: [{ id: 'm1' }, { id: 'm2' }] }] });
    await expect(relaneQueued(db, { key: 'booking_confirmation', line: null })).resolves.toBe(2);
    expect(argsOf(M, 'update')).toEqual([{ line: null }]);
    expect(of(calls, 'eq')).toEqual([
      ['template_key', 'booking_confirmation'], ['direction', 'outbound'], ['status', 'queued'],
    ]);
    expect(of(calls, 'or').map((a) => a[0])).toEqual([
      'error_code.is.null,error_code.neq.sending', 'line.eq.chat', 'line.is.null,line.neq.calls',
    ]);
  });

  it('moved to chat: the unstamped rows take the chat stamp (chat lane)', async () => {
    const { db, calls, argsOf } = fakeDb({ [M]: [{ data: [] }] });
    await expect(relaneQueued(db, { key: 'k', line: 'chat' })).resolves.toBe(0);
    expect(argsOf(M, 'update')).toEqual([{ line: 'chat' }]);
    expect(of(calls, 'or').map((a) => a[0])).toContain('line.is.null,line.neq.chat');
  });

  it('a write error surfaces', async () => {
    const { db } = fakeDb({ [M]: [{ error: { message: 'boom' } }] });
    await expect(relaneQueued(db, { key: 'k', line: null })).rejects.toThrow('boom');
  });
});
