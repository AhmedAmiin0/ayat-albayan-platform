import { afterEach, describe, expect, it, vi } from 'vitest';
import { STUB_WA_ENV, fakeGate, rows } from './send-gate.fakes';

const reads = (calls: { table: string; method: string }[]) => calls.filter((c) => c.table === 'settings' && c.method === 'select').length;

describe('SendGate.switches — both switches from ONE uncached read (the sender asks before every row)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('one settings read answers the kill switch and «الرسائل التلقائية» together, fresh on every call', async () => {
    Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
    const { gate, calls } = fakeGate([rows({ messaging_enabled: true, auto_messages_enabled: false }), rows({ messaging_enabled: false, auto_messages_enabled: true })]);
    await expect(gate.switches()).resolves.toEqual({ open: true, automaticOn: false });
    await expect(gate.switches()).resolves.toEqual({ open: false, automaticOn: true });
    expect(reads(calls)).toBe(2);
  });

  it('WhatsApp not configured: closed with no read; a failed read rejects (fail-closed)', async () => {
    vi.stubEnv('WA_API_BASE', '');
    const closed = fakeGate([rows({ messaging_enabled: true })]);
    await expect(closed.gate.switches()).resolves.toEqual({ open: false, automaticOn: false });
    expect(reads(closed.calls)).toBe(0);
    Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
    await expect(fakeGate([{ error: { message: 'down' } }]).gate.switches()).rejects.toThrow('send gate read failed');
  });
});
