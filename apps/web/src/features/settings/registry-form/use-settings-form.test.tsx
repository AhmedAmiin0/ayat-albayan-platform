import { SETTING_DEFAULTS, type AcademySettings, type SettingKey } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingsForm } from './use-settings-form';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const SAVED: AcademySettings = { ...SETTING_DEFAULTS, booking_horizon_weeks: 6 };
const KEYS: SettingKey[] = ['booking_horizon_weeks', 'late_cancel_hours'];

function setup(keys?: SettingKey[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const onSaved = vi.fn();
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(({ settings }) => useSettingsForm(settings, keys ? { keys, onSaved } : { onSaved }), {
    wrapper,
    initialProps: { settings: SAVED },
  });
  return { client, invalidate, onSaved, ...hook };
}

afterEach(() => apiSend.mockReset());

describe('useSettingsForm (a page’s settings form)', () => {
  it('starts from the saved settings: nothing dirty, a changed default can be reset', () => {
    const { result } = setup();
    expect(result.current.form['bookingHorizonWeeks']).toBe('6');
    expect(result.current.dirty('booking_horizon_weeks')).toBe(false);
    expect(result.current.atDefault('booking_horizon_weeks')).toBe(false);
    act(() => result.current.reset('booking_horizon_weeks'));
    expect(result.current.form['bookingHorizonWeeks']).toBe(String(SETTING_DEFAULTS.booking_horizon_weeks));
    expect(result.current.dirty('booking_horizon_weeks')).toBe(true);
    expect(result.current.changed).toEqual(['booking_horizon_weeks']);
  });

  it('a bad value stays on its field and nothing is sent', () => {
    const { result } = setup(KEYS);
    act(() => result.current.set({ bookingHorizonWeeks: '' }));
    act(() => result.current.submit());
    expect(result.current.errors['bookingHorizonWeeks']).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('one PATCH with the changed key only; settings, meta and public config refetched (cache never written); then the baseline', async () => {
    apiSend.mockResolvedValue({ ...SAVED, booking_horizon_weeks: 8 });
    const { client, invalidate, onSaved, result } = setup(KEYS);
    act(() => result.current.set({ bookingHorizonWeeks: '8' }));
    act(() => result.current.submit());
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ moved: [] }));
    expect(apiSend).toHaveBeenCalledExactlyOnceWith('PATCH', '/settings', { bookingHorizonWeeks: 8 });
    expect(client.getQueryData(['settings'])).toBeUndefined();
    expect(invalidate.mock.calls.map(([f]) => f?.queryKey)).toEqual([['settings'], ['config', 'meta'], ['settings', 'public']]);
    expect(result.current.dirty('booking_horizon_weeks')).toBe(false);
    expect(result.current.failed).toBe(false);
  });

  it('nothing changed: no request at all', () => {
    const { onSaved, result } = setup(KEYS);
    act(() => result.current.submit());
    expect(apiSend).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith({ moved: [] });
  });

  it('`{saved, moved}`: a moved key is reported and stays unsaved', async () => {
    apiSend.mockResolvedValue({ saved: [], moved: ['bookingHorizonWeeks'] });
    const { onSaved, result } = setup(KEYS);
    act(() => result.current.set({ bookingHorizonWeeks: '8' }));
    act(() => result.current.submit());
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ moved: ['booking_horizon_weeks'] }));
    expect(result.current.dirty('booking_horizon_weeks')).toBe(true);
  });

  it('fresh settings: untouched keys follow them, an edited key keeps the edit', () => {
    const { result, rerender } = setup(KEYS);
    act(() => result.current.set({ bookingHorizonWeeks: '9' }));
    rerender({ settings: { ...SAVED, booking_horizon_weeks: 3, upload_max_mb: 7 } });
    expect(result.current.form['bookingHorizonWeeks']).toBe('9');
    expect(result.current.form['uploadMaxMb']).toBe('7');
    expect(result.current.initial['uploadMaxMb']).toBe('7');
  });

  it('a failed save says so and keeps the edit', async () => {
    apiSend.mockRejectedValue(new Error('down'));
    const { onSaved, result } = setup(KEYS);
    act(() => result.current.set({ bookingHorizonWeeks: '9' }));
    act(() => result.current.submit());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.dirty('booking_horizon_weeks')).toBe(true);
  });
});
