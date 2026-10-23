import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { SETTINGS } from '@/test/settings-fixture';
import { confirmKind, useValuesController } from './use-values-controller';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

function setup(canWrite = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useValuesController({ settings: SETTINGS, meta: {}, canWrite }), { wrapper });
}

afterEach(() => apiSend.mockReset());

describe('useValuesController', () => {
  it('a row saves alone: only its camelCase key, and another dirty row stays dirty', async () => {
    apiSend.mockResolvedValue(SETTINGS);
    const { result } = setup();
    act(() => result.current.api.drafts.edit('booking_horizon_weeks', { bookingHorizonWeeks: '8' }));
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    act(() => result.current.api.save('booking_horizon_weeks'));
    await waitFor(() => expect(result.current.note?.key).toBe('booking_horizon_weeks'));
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { bookingHorizonWeeks: 8 });
    expect(result.current.api.drafts.dirty('fx_fresh_hours')).toBe(true);
    expect(result.current.said).toBe(t.settingsValues.savedNamed.replace('{name}', t.settings.bookingHorizonWeeks));
  });

  it('a key the API moved stays unsaved with «تُدار من صفحة أخرى»', async () => {
    apiSend.mockResolvedValue({ saved: [], moved: ['lateCancelHours'] });
    const { result } = setup();
    act(() => result.current.api.drafts.edit('late_cancel_hours', { lateCancelHours: '12', lateCancelHoursOn: true }));
    act(() => result.current.api.save('late_cancel_hours'));
    await waitFor(() => expect(result.current.api.status('late_cancel_hours')).toEqual({ state: 'moved' }));
    expect(result.current.api.drafts.dirty('late_cancel_hours')).toBe(true);
    expect(result.current.note).toBeNull();
  });

  it('a refused save keeps the edit and the server message', async () => {
    apiSend.mockRejectedValue(new ApiError(400, { message: 'out of range' }));
    const { result } = setup();
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    act(() => result.current.api.save('fx_fresh_hours'));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours')).toEqual({ state: 'failed', message: 'out of range' }));
    expect(result.current.api.drafts.dirty('fx_fresh_hours')).toBe(true);
  });

  it('an invalid row is never sent; its error is live', () => {
    const { result } = setup();
    act(() => result.current.api.drafts.edit('booking_horizon_weeks', { bookingHorizonWeeks: '40' }));
    expect(result.current.api.error('booking_horizon_weeks')).toBe(t.settingsValues.invalidRange.replace('{min}', '1').replace('{max}', '12'));
    act(() => result.current.api.save('booking_horizon_weeks'));
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('module-owned keys and a read-only admin never save', () => {
    const { result } = setup();
    act(() => result.current.api.apply('messaging_enabled', { messagingEnabled: true }));
    act(() => result.current.api.apply('reminder_minutes_before', { reminderMinutesBefore: '30' }));
    expect(apiSend).not.toHaveBeenCalled();
    const ro = setup(false);
    act(() => ro.result.current.api.apply('fx_fresh_hours', { fxFreshHours: '6' }));
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('asks first: typed for retention days, plain for a booking switch; cancel puts the switch back', async () => {
    expect(confirmKind('activity_retention_days', 30)).toBe('typed');
    expect(confirmKind('recording_retention_days', null)).toBeUndefined();
    expect(confirmKind('fx_fresh_hours', 6)).toBeUndefined();
    const { result } = setup();
    act(() => result.current.api.apply('teachers_always_available', { teachersAlwaysAvailable: false }));
    expect(result.current.pending).toMatchObject({ key: 'teachers_always_available', kind: 'plain' });
    act(() => result.current.cancel());
    expect(result.current.api.drafts.dirty('teachers_always_available')).toBe(false);
    apiSend.mockResolvedValue(SETTINGS);
    act(() => result.current.api.apply('activity_retention_days', { activityRetentionDays: '30' }));
    expect(result.current.pending?.kind).toBe('typed');
    act(() => result.current.confirm());
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { activityRetentionDays: 30 }));
  });

  it('undo re-saves the previous value', async () => {
    apiSend.mockResolvedValue(SETTINGS);
    const { result } = setup();
    act(() => result.current.api.apply('fx_fresh_hours', { fxFreshHours: '6' }));
    await waitFor(() => expect(result.current.note).not.toBeNull());
    const note = result.current.note;
    if (note) act(() => result.current.undo(note));
    await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith('PATCH', '/settings', { fxFreshHours: 24 }));
  });
});
