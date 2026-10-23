import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakeSettings, readerOf } from '../../common/settings/settings.fakes';
import { WhatsappSettings } from './whatsapp.settings';

/** What SendGate read before the reader existed: the reader lists exactly these. */
const BEFORE = ['messaging_enabled', 'auto_messages_enabled'] as const;

describe('WhatsappSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults (both switches OFF)', async () => {
    const values = await readerOf(WhatsappSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
    expect(values).toEqual({ messaging_enabled: false, auto_messages_enabled: false });
  });

  it('answers the stored switches', async () => {
    const values = await readerOf(WhatsappSettings, { messaging_enabled: true, auto_messages_enabled: true }).read();
    expect(values).toEqual({ messaging_enabled: true, auto_messages_enabled: true });
  });

  it('a failed store read rejects (never a default that could open the gate)', async () => {
    const store = fakeSettings();
    vi.mocked(store.all).mockRejectedValue(new Error('db down'));
    await expect(new WhatsappSettings(store).read()).rejects.toThrow('db down');
  });
});
