import { CLOCK_STORAGE_KEY, clockOf } from '@ab/time';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clockCycle, useClock } from './clock';

afterEach(() => vi.restoreAllMocks());

const at = new Date('2026-10-03T14:05:00Z');

const withHourCycle = (hourCycle: Intl.ResolvedDateTimeFormatOptions['hourCycle']) =>
  vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
    ...new Intl.DateTimeFormat('en-GB').resolvedOptions(),
    hourCycle,
  });

describe('web clock: always 12-hour', () => {
  it('ignores a stored 24-hour choice', () => {
    localStorage.setItem(CLOCK_STORAGE_KEY, '24');
    expect(clockCycle()).toBe('12');
    expect(renderHook(() => useClock()).result.current.cycle).toBe('12');
  });

  it('ignores a locale whose default is 24-hour', () => {
    withHourCycle('h23');
    expect(clockCycle()).toBe('12');
    expect(renderHook(() => useClock()).result.current.cycle).toBe('12');
  });

  it('formats with the AM/PM marks of the UI language', () => {
    const clock = renderHook(() => useClock()).result.current;
    expect(clockOf(at, { ...clock, tz: 'Asia/Riyadh' })).toBe('5:05 م');
    expect(clockOf(at, { ...clock, locale: 'en', tz: 'UTC' })).toBe('2:05 PM');
  });
});
