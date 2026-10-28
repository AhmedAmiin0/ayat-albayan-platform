import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import type { MessageViews } from '../../whatsapp/messages/message.views';
import { CallsNumberStore } from './calls-number.store';

const views = {} as MessageViews;
const AT = new Date('2026-10-27T09:00:00Z');
const reply = { phoneNumberId: 'calls-pn', phone: '+201001234567', response: 'accepted' as const, expiresAt: new Date('2026-11-03T09:00:00Z'), at: AT };

describe('CallsNumberStore (docs/28 §10)', () => {
  it('stores an answer with its expiry, keyed by (calls number, phone)', async () => {
    const { db, argsOf } = fakeDb({ wa_call_permissions: [{ data: null }, {}] });
    await new CallsNumberStore(db, views).saveReply(reply);
    expect(argsOf('wa_call_permissions', 'upsert')).toEqual([
      expect.objectContaining({ phone_number_id: 'calls-pn', phone_e164: '+201001234567', response: 'accepted', replied_at: AT.toISOString(), expires_at: '2026-11-03T09:00:00.000Z' }),
      { onConflict: 'phone_number_id,phone_e164' },
    ]);
  });

  it('an older answer arriving late never replaces a newer one', async () => {
    const newer = { response: 'rejected', replied_at: '2026-10-27T10:00:00.000Z', expires_at: null };
    const { db, calls } = fakeDb({ wa_call_permissions: [{ data: newer }] });
    await new CallsNumberStore(db, views).saveReply(reply);
    expect(calls.some((c) => c.method === 'upsert')).toBe(false);
  });

  it('reads the answer back as the view shape; none = null', async () => {
    const { db } = fakeDb({ wa_call_permissions: [{ data: { response: 'accepted', replied_at: 'r', expires_at: 'e' } }, { data: null }] });
    const store = new CallsNumberStore(db, views);
    await expect(store.reply('calls-pn', '+201001234567')).resolves.toEqual({ response: 'accepted', at: 'r', expires_at: 'e' });
    await expect(store.reply('calls-pn', '+201001234567')).resolves.toBeNull();
  });

  it('the window reads the family\'s newest inbound on line calls only', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [{ created_at: '2026-10-27T08:00:00Z' }] }] });
    await expect(new CallsNumberStore(db, views).lastInbound('+201001234567')).resolves.toBe('2026-10-27T08:00:00Z');
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['phone_e164', '+201001234567'], ['direction', 'inbound'], ['line', 'calls']]);
  });

  it('sent / failed move only the row this request queued (still queued)', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: { id: 'm1' } }, { data: { id: 'm2' } }] });
    const store = new CallsNumberStore(db, views);
    await store.sent('m1', 'wamid.P');
    await store.failed('m2', 'meta_131047');
    const updates = calls.filter((c) => c.method === 'update').map((c) => c.args[0]);
    expect(updates[0]).toMatchObject({ status: 'sent', wa_message_id: 'wamid.P' });
    expect(updates[1]).toMatchObject({ status: 'failed', error_code: 'meta_131047' });
    expect(calls.filter((c) => c.method === 'eq' && c.args[0] === 'status').map((c) => c.args[1])).toEqual(['queued', 'queued']);
  });
});
