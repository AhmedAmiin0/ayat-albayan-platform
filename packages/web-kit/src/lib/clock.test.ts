import { afterEach, describe, expect, it, vi } from 'vitest';
import { deviceUses24 } from './clock';

afterEach(() => vi.restoreAllMocks());

const withHourCycle = (hourCycle: Intl.ResolvedDateTimeFormatOptions['hourCycle']) =>
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...new Intl.DateTimeFormat('en-GB').resolvedOptions(),
    hourCycle,
  });

describe('deviceUses24 (the browser locale)', () => {
  it('h12 / h11 locales are 12-hour, h23 is 24-hour, unknown is null', () => {
    withHourCycle('h12');
    expect(deviceUses24()).toBe(false);
    withHourCycle('h11');
    expect(deviceUses24()).toBe(false);
    withHourCycle('h23');
    expect(deviceUses24()).toBe(true);
    withHourCycle(undefined);
    expect(deviceUses24()).toBeNull();
  });

  it('a throwing Intl reads as unknown', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockImplementation(() => {
      throw new Error('no Intl');
    });
    expect(deviceUses24()).toBeNull();
  });
});
