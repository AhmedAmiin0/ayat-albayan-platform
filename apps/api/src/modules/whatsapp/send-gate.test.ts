import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeSettings } from '../../common/settings/settings.fakes';
import type { Db } from '../../common/db/db.module';
import { fakeDb } from '../guardians/fake-db';
import { SendGate } from './send-gate';
import { WhatsappSettings } from './whatsapp.settings';

// A full fake store (registry defaults); each test stubs what all() answers next.
const store = fakeSettings();
const all = vi.mocked(store.all);
const gate = (db: Db = fakeDb({}).db) => new SendGate(new WhatsappSettings(store), db);

function stubWhatsapp(): void {
  vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
  vi.stubEnv('WA_PHONE_NUMBER_ID', 'stub-phone');
  vi.stubEnv('WA_WABA_ID', 'stub-waba');
  vi.stubEnv('WA_ACCESS_TOKEN', 'stub-token');
}

describe('SendGate — WhatsApp configured AND the admin kill switch (no env fuse, docs/23)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it('WhatsApp not configured → closed, no settings read at all', async () => {
    vi.stubEnv('WA_API_BASE', '');
    await expect(gate().open()).resolves.toBe(false);
    expect(all).not.toHaveBeenCalled();
  });

  it('configured: the admin’s settings.messaging_enabled alone decides', async () => {
    stubWhatsapp();
    all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: false });
    await expect(gate().open()).resolves.toBe(false);
    all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: true });
    await expect(gate().open()).resolves.toBe(true);
  });

  it('fail-closed: the defaults (no row) and anything but a stored true keep it closed', async () => {
    stubWhatsapp();
    expect(SETTING_DEFAULTS.messaging_enabled).toBe(false);
    for (const value of [undefined, null, 'true', 1, {}]) {
      const stored = { ...SETTING_DEFAULTS, messaging_enabled: value } as unknown as AcademySettings;
      all.mockResolvedValueOnce(stored);
      await expect(gate().open(), String(value)).resolves.toBe(false);
      all.mockResolvedValueOnce(stored);
      await expect(gate().state(), String(value)).resolves.toEqual({ open: false, reason: 'switch_off' });
    }
  });

  it('fail-closed on a read error: open, state and view reject, never an open gate', async () => {
    stubWhatsapp();
    all.mockRejectedValue(new Error('db down'));
    await expect(gate().open()).rejects.toThrow('db down');
    await expect(gate().state()).rejects.toThrow('db down');
    await expect(gate().view()).rejects.toThrow('db down');
  });

  it('a leftover MESSAGING_ENABLED in the server env changes nothing, either way', async () => {
    stubWhatsapp();
    vi.stubEnv('MESSAGING_ENABLED', 'true');
    all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: false });
    await expect(gate().open()).resolves.toBe(false);
    vi.stubEnv('MESSAGING_ENABLED', 'false');
    all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: true });
    await expect(gate().open()).resolves.toBe(true);
  });

  it('state names the closed gate for the admin (settings chip, composer note)', async () => {
    vi.stubEnv('WA_API_BASE', '');
    await expect(gate().state()).resolves.toEqual({ open: false, reason: 'not_configured' });
    stubWhatsapp();
    all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: false });
    await expect(gate().state()).resolves.toEqual({ open: false, reason: 'switch_off' });
    all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: true });
    await expect(gate().state()).resolves.toEqual({ open: true, reason: null });
  });

  it('automaticOn is the admin’s settings.auto_messages_enabled (OFF by default), independent of the gate', async () => {
    all.mockResolvedValueOnce(SETTING_DEFAULTS);
    await expect(gate().automaticOn()).resolves.toBe(false);
    all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, auto_messages_enabled: true });
    await expect(gate().automaticOn()).resolves.toBe(true);
  });

  it('view adds the queue that goes out the moment the gate opens', async () => {
    vi.stubEnv('WA_API_BASE', '');
    const { db } = fakeDb({ messages: [{ count: 7 }] });
    await expect(gate(db).view()).resolves.toEqual({ open: false, reason: 'not_configured', queued: 7 });
  });
});
