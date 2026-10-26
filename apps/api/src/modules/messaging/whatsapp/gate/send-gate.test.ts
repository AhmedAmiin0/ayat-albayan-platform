import { afterEach, describe, expect, it, vi } from 'vitest';
import { STUB_WA_ENV, fakeGate, rows } from './send-gate.fakes';

const stubWhatsapp = () => Object.entries(STUB_WA_ENV).forEach(([k, v]) => vi.stubEnv(k, v));
const gateReads = (calls: { table: string; method: string }[]) =>
  calls.filter((c) => c.table === 'settings' && c.method === 'select').length;

describe('SendGate — WhatsApp configured AND the admin kill switch (no env fuse, docs/23)', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('WhatsApp not configured → closed, no settings read at all', async () => {
    vi.stubEnv('WA_API_BASE', '');
    const { gate, calls } = fakeGate([rows({ messaging_enabled: true })]);
    await expect(gate.open()).resolves.toBe(false);
    expect(gateReads(calls)).toBe(0);
  });

  it('configured: the admin’s settings.messaging_enabled alone decides', async () => {
    stubWhatsapp();
    const { gate } = fakeGate([rows({ messaging_enabled: false }), rows({ messaging_enabled: true })]);
    await expect(gate.open()).resolves.toBe(false);
    await expect(gate.open()).resolves.toBe(true);
  });

  it('a leftover MESSAGING_ENABLED in the server env changes nothing, either way', async () => {
    stubWhatsapp();
    const { gate } = fakeGate([rows({ messaging_enabled: false }), rows({ messaging_enabled: true })]);
    vi.stubEnv('MESSAGING_ENABLED', 'true');
    await expect(gate.open()).resolves.toBe(false);
    vi.stubEnv('MESSAGING_ENABLED', 'false');
    await expect(gate.open()).resolves.toBe(true);
  });

  it('state names the closed gate for the admin (settings chip, composer note)', async () => {
    vi.stubEnv('WA_API_BASE', '');
    await expect(fakeGate([]).gate.state()).resolves.toEqual({ open: false, reason: 'not_configured' });
    stubWhatsapp();
    const { gate } = fakeGate([rows({ messaging_enabled: false }), rows({ messaging_enabled: true })]);
    await expect(gate.state()).resolves.toEqual({ open: false, reason: 'switch_off' });
    await expect(gate.state()).resolves.toEqual({ open: true, reason: null });
  });

  it('automaticOn is the admin’s settings.auto_messages_enabled (OFF when missing), independent of the gate', async () => {
    const { gate } = fakeGate([rows({}), rows({ auto_messages_enabled: true, messaging_enabled: false })]);
    await expect(gate.automaticOn()).resolves.toBe(false);
    await expect(gate.automaticOn()).resolves.toBe(true);
  });

  it('view adds the queue that goes out the moment the gate opens', async () => {
    vi.stubEnv('WA_API_BASE', '');
    await expect(fakeGate([], 7).gate.view()).resolves.toEqual({ open: false, reason: 'not_configured', queued: 7 });
  });
});
