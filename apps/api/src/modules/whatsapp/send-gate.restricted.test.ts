import { SETTING_DEFAULTS } from '@ab/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SettingsService } from '../../common/settings/settings.service';
import { fakeDb } from '../guardians/fake-db';
import { SendGate } from './send-gate';

const settings = { all: vi.fn() };
const gate = () => new SendGate(settings as unknown as SettingsService, fakeDb({ messages: [{ count: 3 }] }).db);

describe('SendGate.view restricted flag (WA_ALLOWED_RECIPIENTS, docs/12 §13.5)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it('restricted: true when the allow-list is set (read at construction)', async () => {
    vi.stubEnv('WA_API_BASE', '');
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+20 100 123 4567, 966551234567');
    await expect(gate().view()).resolves.toEqual({ open: false, reason: 'not_configured', queued: 3, restricted: true });
  });

  it('the key is ABSENT when the list is unset or blank (exact-shape asserts hold)', async () => {
    vi.stubEnv('WA_API_BASE', '');
    for (const raw of ['', '   ']) {
      vi.stubEnv('WA_ALLOWED_RECIPIENTS', raw);
      const view = await gate().view();
      expect(view).toEqual({ open: false, reason: 'not_configured', queued: 3 });
      expect(Object.keys(view)).not.toContain('restricted');
    }
  });

  it('an open gate keeps its state and adds the flag', async () => {
    vi.stubEnv('WA_API_BASE', 'http://127.0.0.1:4010');
    vi.stubEnv('WA_PHONE_NUMBER_ID', 'stub-phone');
    vi.stubEnv('WA_WABA_ID', 'stub-waba');
    vi.stubEnv('WA_ACCESS_TOKEN', 'stub-token');
    vi.stubEnv('WA_ALLOWED_RECIPIENTS', '+201001234567');
    settings.all.mockResolvedValue({ ...SETTING_DEFAULTS, messaging_enabled: true });
    await expect(gate().view()).resolves.toEqual({ open: true, reason: null, queued: 3, restricted: true });
  });
});
