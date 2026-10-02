import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SettingsService } from '../../common/settings/settings.service';
import { SETTING_DEFAULTS } from '../../common/settings/settings.values';
import type { Db } from '../../common/db/db.module';
import { fakeDb } from '../guardians/fake-db';
import { SendGate } from './send-gate';

const settings = { all: vi.fn() };
const gate = (db: Db = fakeDb({}).db) => new SendGate(settings as unknown as SettingsService, db);

function stubWhatsapp(enabled: string): void {
  vi.stubEnv('MESSAGING_ENABLED', enabled);
  vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
  vi.stubEnv('WA_PHONE_NUMBER_ID', 'stub-phone');
  vi.stubEnv('WA_WABA_ID', 'stub-waba');
  vi.stubEnv('WA_ACCESS_TOKEN', 'stub-token');
}

describe('SendGate — env switch AND WhatsApp configured AND the admin kill switch', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it('closed by the deployment (MESSAGING_ENABLED unset): no settings read at all', async () => {
    vi.stubEnv('MESSAGING_ENABLED', '');
    await expect(gate().open()).resolves.toBe(false);
    expect(settings.all).not.toHaveBeenCalled();
  });

  it('env on but WhatsApp not configured → closed', async () => {
    vi.stubEnv('MESSAGING_ENABLED', 'true');
    vi.stubEnv('WA_API_BASE', '');
    await expect(gate().open()).resolves.toBe(false);
  });

  it('env on + configured: the admin’s settings.messaging_enabled decides', async () => {
    stubWhatsapp('true');
    settings.all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: false });
    await expect(gate().open()).resolves.toBe(false);
    settings.all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: true });
    await expect(gate().open()).resolves.toBe(true);
  });

  it('state names the closed gate for the admin (settings chip, composer note)', async () => {
    vi.stubEnv('MESSAGING_ENABLED', '');
    await expect(gate().state()).resolves.toEqual({ open: false, reason: 'env_off' });
    vi.stubEnv('MESSAGING_ENABLED', 'true');
    vi.stubEnv('WA_API_BASE', '');
    await expect(gate().state()).resolves.toEqual({ open: false, reason: 'not_configured' });
    stubWhatsapp('true');
    settings.all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: false });
    await expect(gate().state()).resolves.toEqual({ open: false, reason: 'switch_off' });
    settings.all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, messaging_enabled: true });
    await expect(gate().state()).resolves.toEqual({ open: true, reason: null });
  });

  it('automaticOn is the admin’s settings.auto_messages_enabled (OFF by default), independent of the gate', async () => {
    vi.stubEnv('MESSAGING_ENABLED', '');
    settings.all.mockResolvedValueOnce(SETTING_DEFAULTS);
    await expect(gate().automaticOn()).resolves.toBe(false);
    settings.all.mockResolvedValueOnce({ ...SETTING_DEFAULTS, auto_messages_enabled: true });
    await expect(gate().automaticOn()).resolves.toBe(true);
  });

  it('view adds the queue that goes out the moment the gate opens', async () => {
    vi.stubEnv('MESSAGING_ENABLED', '');
    const { db } = fakeDb({ messages: [{ count: 7 }] });
    await expect(gate(db).view()).resolves.toEqual({ open: false, reason: 'env_off', queued: 7 });
  });
});
