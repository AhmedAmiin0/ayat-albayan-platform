import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingsForm } from './use-settings-form';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const SAVED: AcademySettings = { ...SETTING_DEFAULTS, booking_horizon_weeks: 6 };

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const onSaved = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useSettingsForm(SAVED, onSaved), { wrapper });
  return { client, invalidate, onSaved, result };
}

afterEach(() => apiSend.mockReset());

describe('useSettingsForm (the one «حفظ» of /admin/settings)', () => {
  it('starts from the saved settings: nothing dirty, a changed default can be reset', () => {
    const { result } = setup();
    expect(result.current.form['bookingHorizonWeeks']).toBe('6');
    expect(result.current.dirty('booking_horizon_weeks')).toBe(false);
    expect(result.current.atDefault('booking_horizon_weeks')).toBe(false);
    act(() => result.current.reset('booking_horizon_weeks'));
    expect(result.current.form['bookingHorizonWeeks']).toBe(String(SETTING_DEFAULTS.booking_horizon_weeks));
    expect(result.current.dirty('booking_horizon_weeks')).toBe(true);
    expect(result.current.atDefault('booking_horizon_weeks')).toBe(true);
  });

  it('a bad value stays on its field and nothing is sent', () => {
    const { result } = setup();
    act(() => result.current.set({ bookingHorizonWeeks: '' }));
    act(() => result.current.submit());
    expect(result.current.errors['bookingHorizonWeeks']).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('one PATCH, the answer into [settings], public config and meta refreshed, then onSaved; the save becomes the baseline', async () => {
    const next = { ...SAVED, booking_horizon_weeks: 8 };
    apiSend.mockResolvedValue(next);
    const { client, invalidate, onSaved, result } = setup();
    act(() => result.current.set({ bookingHorizonWeeks: '8' }));
    expect(result.current.dirty('booking_horizon_weeks')).toBe(true);
    act(() => result.current.submit());
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', expect.objectContaining({ bookingHorizonWeeks: 8 }));
    expect(client.getQueryData(['settings'])).toEqual(next);
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([
      ['settings', 'public'],
      ['config', 'meta'],
    ]);
    await waitFor(() => expect(result.current.dirty('booking_horizon_weeks')).toBe(false));
    expect(result.current.failed).toBe(false);
  });

  it('a failed save says so and keeps the edit', async () => {
    apiSend.mockRejectedValue(new Error('down'));
    const { onSaved, result } = setup();
    act(() => result.current.set({ bookingHorizonWeeks: '9' }));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.dirty('booking_horizon_weeks')).toBe(true);
  });
});
