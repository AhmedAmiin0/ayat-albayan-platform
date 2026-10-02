import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SettingsService } from '../../common/settings/settings.service';
import { SETTING_DEFAULTS } from '../../common/settings/settings.values';
import { SendGate } from './send-gate';

const settings = { all: vi.fn() };
const gate = () => new SendGate(settings as unknown as SettingsService);

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
});
