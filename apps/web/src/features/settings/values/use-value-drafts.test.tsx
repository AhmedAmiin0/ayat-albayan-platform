import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SETTINGS } from '@/test/settings-fixture';
import { pruneDrafts, useValueDrafts } from './use-value-drafts';

describe('useValueDrafts', () => {
  it('a row shows the stored value until edited; the edit is dirty until it matches again', () => {
    const { result } = renderHook(() => useValueDrafts(SETTINGS));
    expect(result.current.form('booking_horizon_weeks')).toEqual({ bookingHorizonWeeks: '5' });
    act(() => result.current.edit('booking_horizon_weeks', { bookingHorizonWeeks: '8' }));
    expect(result.current.dirty('booking_horizon_weeks')).toBe(true);
    expect(result.current.dirtyKeys()).toEqual(['booking_horizon_weeks']);
    act(() => result.current.edit('booking_horizon_weeks', { bookingHorizonWeeks: '5' }));
    expect(result.current.dirty('booking_horizon_weeks')).toBe(false);
    expect(result.current.dirtyKeys()).toEqual([]);
  });

  it('keeps every local edit when the settings are refetched (and only discards the one asked)', () => {
    const { result, rerender } = renderHook(({ s }) => useValueDrafts(s), { initialProps: { s: SETTINGS } });
    act(() => result.current.edit('booking_horizon_weeks', { bookingHorizonWeeks: '8' }));
    act(() => result.current.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    rerender({ s: { ...SETTINGS, booking_horizon_weeks: 3, fx_fresh_hours: 12 } });
    expect(result.current.form('booking_horizon_weeks')).toEqual({ bookingHorizonWeeks: '8' });
    expect(result.current.form('fx_fresh_hours')).toEqual({ fxFreshHours: '6' });
    expect(result.current.form('makeup_window_days')).toEqual({ makeupWindowDays: '60' });
    act(() => result.current.discard('booking_horizon_weeks'));
    expect(result.current.form('booking_horizon_weeks')).toEqual({ bookingHorizonWeeks: '3' });
    expect(result.current.dirty('fx_fresh_hours')).toBe(true);
  });

  it('put replaces the row’s fields', () => {
    const { result } = renderHook(() => useValueDrafts(SETTINGS));
    act(() => result.current.put('teachers_always_available', { teachersAlwaysAvailable: false }));
    expect(result.current.dirty('teachers_always_available')).toBe(true);
  });

  it('a draft typed back to the stored value is dropped, so a refetched value shows through', () => {
    const { result, rerender } = renderHook(({ s }) => useValueDrafts(s), { initialProps: { s: SETTINGS } });
    act(() => result.current.edit('booking_horizon_weeks', { bookingHorizonWeeks: '8' }));
    act(() => result.current.edit('booking_horizon_weeks', { bookingHorizonWeeks: '5' }));
    rerender({ s: { ...SETTINGS, booking_horizon_weeks: 9 } });
    expect(result.current.form('booking_horizon_weeks')).toEqual({ bookingHorizonWeeks: '9' });
    act(() => result.current.put('fx_fresh_hours', { fxFreshHours: String(SETTINGS.fx_fresh_hours) }));
    rerender({ s: { ...SETTINGS, booking_horizon_weeks: 9, fx_fresh_hours: 12 } });
    expect(result.current.form('fx_fresh_hours')).toEqual({ fxFreshHours: '12' });
  });

  it('a refetch that now holds the draft drops it', () => {
    const { result, rerender } = renderHook(({ s }) => useValueDrafts(s), { initialProps: { s: SETTINGS } });
    act(() => result.current.edit('booking_horizon_weeks', { bookingHorizonWeeks: '8' }));
    rerender({ s: { ...SETTINGS, booking_horizon_weeks: 8 } });
    rerender({ s: { ...SETTINGS, booking_horizon_weeks: 3 } });
    expect(result.current.form('booking_horizon_weeks')).toEqual({ bookingHorizonWeeks: '3' });
  });

  it('pruneDrafts keeps the same object when every draft is a real edit', () => {
    const drafts = { booking_horizon_weeks: { bookingHorizonWeeks: '8' } };
    expect(pruneDrafts(drafts, SETTINGS)).toBe(drafts);
    expect(pruneDrafts(drafts, { ...SETTINGS, booking_horizon_weeks: 8 })).toEqual({});
  });
});
