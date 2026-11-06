import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import type { HeldRow } from './app-send-adopt';
import { AppSendAdoptRepo } from './app-send-adopt.repo';

// The read and the one transaction of the adopt (docs/19, migration 20261106000601).

const PHONE = '+966500000001';
const NOW = new Date('2026-11-06T10:00:00Z');
const held: HeldRow = {
  id: 'h1',
  phone_e164: PHONE,
  body: 'x',
  line: 'chat',
  number_id: null,
  created_at: '2026-11-06T09:00:00Z',
  lead_id: 'l1',
  dedup_key: null,
};
const filters = (calls: { method: string; args: unknown[] }[]) =>
  calls.map((c) => [c.method, ...c.args]);

describe('AppSendAdoptRepo.twins', () => {
  it('external outbound plain texts of the phone from the last 30 minutes', async () => {
    const rows = [{ id: 'e1', body: 'x', line: 'chat', number_id: null }];
    const { db, calls } = fakeDb({ messages: [{ data: rows }] });
    await expect(new AppSendAdoptRepo(db).twins(held, NOW)).resolves.toEqual(rows);
    const f = filters(calls);
    expect(f).toContainEqual(['eq', 'phone_e164', PHONE]);
    expect(f).toContainEqual(['is', 'created_by', null]);
    expect(f).toContainEqual(['is', 'dedup_key', null]);
    expect(f).toContainEqual(['not', 'wa_message_id', 'is', null]);
    expect(f).toContainEqual(['in', 'status', ['sent', 'delivered', 'read']]);
    expect(f).toContainEqual(['is', 'template_key', null]);
    expect(f).toContainEqual(['is', 'interactive_payload', null]);
    expect(f).toContainEqual(['gte', 'created_at', '2026-11-06T09:30:00.000Z']);
  });

  it('never a message older than the held row (an earlier identical one is not taken)', async () => {
    const { db, calls } = fakeDb({ messages: [{ data: [] }] });
    await new AppSendAdoptRepo(db).twins({ ...held, created_at: '2026-11-06T09:55:00Z' }, NOW);
    expect(filters(calls)).toContainEqual(['gte', 'created_at', '2026-11-06T09:55:00.000Z']);
  });

  it('a read error throws', async () => {
    const { db } = fakeDb({ messages: [{ error: { message: 'boom' } }] });
    await expect(new AppSendAdoptRepo(db).twins(held, NOW)).rejects.toThrow('boom');
  });
});

describe('AppSendAdoptRepo.adopt', () => {
  it('one rpc with both ids; adopted: the lead is stamped as on any send', async () => {
    const { db, calls } = fakeDb({ 'rpc:app_send_adopt': [{ data: true }], leads: [{}] });
    await expect(new AppSendAdoptRepo(db).adopt(held, 'e1')).resolves.toBe(true);
    expect(filters(calls)).toContainEqual(['rpc', { p_held: 'h1', p_external: 'e1' }]);
    expect(calls.some((c) => c.table === 'leads')).toBe(true);
  });

  it('either row moved: false, nothing stamped', async () => {
    const { db, calls } = fakeDb({ 'rpc:app_send_adopt': [{ data: false }] });
    await expect(new AppSendAdoptRepo(db).adopt(held, 'e1')).resolves.toBe(false);
    expect(calls.some((c) => c.table === 'leads')).toBe(false);
  });

  it('an rpc error throws (one transaction: nothing half-done)', async () => {
    const { db } = fakeDb({ 'rpc:app_send_adopt': [{ error: { message: 'boom' } }] });
    await expect(new AppSendAdoptRepo(db).adopt(held, 'e1')).rejects.toThrow('boom');
  });
});
