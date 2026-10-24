import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { rows } from './send-gate.fakes';
import { WhatsappSettings } from './whatsapp.settings';

/** What SendGate read before the reader existed: the reader lists exactly these. */
const BEFORE = ['messaging_enabled', 'auto_messages_enabled'] as const;

describe('WhatsappSettings (uncached primary-key read, docs/26 §5 26-P4)', () => {
  it('reads exactly its keys, in order; no rows → both switches OFF', async () => {
    const { db, argsOf } = fakeDb({ settings: [rows({})] });
    const values = await new WhatsappSettings(db).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual({ messaging_enabled: false, auto_messages_enabled: false });
    expect(argsOf('settings', 'select')).toEqual(['key, value']);
    expect(argsOf('settings', 'in')).toEqual(['key', [...BEFORE]]);
  });

  it('answers the stored switches', async () => {
    const { db } = fakeDb({ settings: [rows({ messaging_enabled: true, auto_messages_enabled: true })] });
    await expect(new WhatsappSettings(db).read()).resolves.toEqual({ messaging_enabled: true, auto_messages_enabled: true });
  });

  it('a failed read rejects (never a default that could open the gate)', async () => {
    const { db } = fakeDb({ settings: [{ error: { message: 'db down' } }] });
    await expect(new WhatsappSettings(db).read()).rejects.toThrow('db down');
  });
});
