import { describe, expect, it, vi } from 'vitest';
import { LINE_KEYS, moduleOverlay, type DefaultNumber } from './numbers.lines';

const notif: DefaultNumber = {
  id: 'num-1', purpose: 'notifications', provider: 'meta', phone_number_id: '1000000001', waba_id: '2000000001', app_id: null,
  secrets: { access_token: 'token-fake', app_secret: 'secret-fake' },
};

describe('moduleOverlay: each role\'s default number → that role\'s line keys', () => {
  it('fills the notifications keys and blanks every chat key (no chat default = chat unconfigured)', () => {
    const { values, numberIds } = moduleOverlay([notif], vi.fn());
    expect(values).toMatchObject({ WA_PROVIDER: 'meta', WA_PHONE_NUMBER_ID: '1000000001', WA_WABA_ID: '2000000001', WA_ACCESS_TOKEN: 'token-fake', WA_APP_SECRET: 'secret-fake', WA_APP_ID: '' });
    expect(values.WA_CHAT_PHONE_NUMBER_ID).toBe('');
    expect(values.WA_CHAT_ACCESS_TOKEN).toBe('');
    expect(Object.keys(values).sort()).toEqual([...LINE_KEYS].sort());
    expect(numberIds).toEqual({ notifications: 'num-1' });
  });

  it('a chat default fills the WA_CHAT_* keys; a missing secret stays blank', () => {
    const chat: DefaultNumber = { ...notif, id: 'num-2', purpose: 'chat', provider: 'kapso', phone_number_id: '1000000002', secrets: {} };
    const { values, numberIds } = moduleOverlay([notif, chat], vi.fn());
    expect(values).toMatchObject({ WA_CHAT_PROVIDER: 'kapso', WA_CHAT_PHONE_NUMBER_ID: '1000000002', WA_CHAT_ACCESS_TOKEN: '' });
    expect(numberIds).toEqual({ notifications: 'num-1', chat: 'num-2' });
  });

  it('a value the env schema refuses is blanked and named (never its value)', () => {
    const onBad = vi.fn();
    const { values } = moduleOverlay([{ ...notif, provider: 'other' }], onBad);
    expect(values.WA_PROVIDER).toBe('');
    expect(onBad).toHaveBeenCalledWith('WA_PROVIDER');
  });
});
