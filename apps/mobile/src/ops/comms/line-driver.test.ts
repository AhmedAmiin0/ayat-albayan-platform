import { driverValues, lineDriver } from './line-driver';

// docs/19: the line's driver as the integrations list says it, and the one key a switch saves.

describe('lineDriver / driverValues', () => {
  it('reads each line\'s own key; an unset or unknown value is meta (the default)', () => {
    const items = [
      { key: 'WA_PROVIDER' as const, value: 'crm' },
      { key: 'WA_CHAT_PROVIDER' as const, value: 'smtp' },
    ];
    expect(lineDriver(items, 'notifications')).toBe('crm');
    expect(lineDriver(items, 'chat')).toBe('meta');
    expect(lineDriver([], 'notifications')).toBe('meta');
  });

  it('saves only the switched line\'s key', () => {
    expect(driverValues('chat', 'kapso')).toEqual({ values: { WA_CHAT_PROVIDER: 'kapso' } });
    expect(driverValues('notifications', 'crm')).toEqual({ values: { WA_PROVIDER: 'crm' } });
  });
});
