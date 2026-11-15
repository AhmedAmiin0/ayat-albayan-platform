import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { answerPatch, seedEntries } from '@/test/entries-fixture';
import { SETTINGS } from '@/test/settings-fixture';
import { confirmKind, useValuesController } from './use-values-controller';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

function setup(canWrite = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  seedEntries(client);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useValuesController({ settings: SETTINGS, meta: {}, canWrite, entries: [], describe: vi.fn() }), { wrapper });
}

const patch = (key: string, body: object) => ['PATCH', `/config/entries/${key}`, body] as const;

afterEach(() => {
  apiSend.mockReset();
  apiFetch.mockReset();
});

describe('useValuesController', () => {
  it('a row saves alone: PATCH /config/entries/:key with its version, and another dirty row stays dirty', async () => {
    apiSend.mockImplementation(answerPatch);
    const { result } = setup();
    act(() => result.current.api.drafts.edit('booking_horizon_weeks', { bookingHorizonWeeks: '8' }));
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    act(() => result.current.api.save('booking_horizon_weeks'));
    await waitFor(() => expect(result.current.note?.key).toBe('booking_horizon_weeks'));
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend).toHaveBeenCalledWith(...patch('booking_horizon_weeks', { value: 8, expectedVersion: 1 }));
    expect(result.current.api.drafts.dirty('fx_fresh_hours')).toBe(true);
    expect(result.current.said).toBe(t.settingsValues.savedNamed.replace('{name}', t.settings.bookingHorizonWeeks));
  });

  it('409 owned_by_module drops its edit and shows «تُدار من صفحة أخرى»', async () => {
    apiSend.mockRejectedValue(new ApiError(409, { code: 'owned_by_module' }));
    const { result } = setup();
    act(() => result.current.api.drafts.edit('late_cancel_hours', { lateCancelHours: '12', lateCancelHoursOn: true }));
    act(() => result.current.api.save('late_cancel_hours'));
    await waitFor(() => expect(result.current.api.status('late_cancel_hours')).toEqual({ state: 'moved' }));
    expect(result.current.api.drafts.dirty('late_cancel_hours')).toBe(false);
    expect(result.current.said).toBe(t.settingsValues.moved);
    expect(result.current.note).toBeNull();
  });

  it('422 invalid keeps the edit and the server message', async () => {
    apiSend.mockRejectedValue(new ApiError(422, { code: 'invalid', message: 'out of range' }));
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

  it('asks first: typed sends the typed text as confirmText; cancel puts a plain switch back', async () => {
    expect(confirmKind('activity_retention_days', 30)).toBe('typed');
    expect(confirmKind('recording_retention_days', null)).toBeUndefined();
    expect(confirmKind('fx_fresh_hours', 6)).toBeUndefined();
    const { result } = setup();
    act(() => result.current.api.apply('teachers_always_available', { teachersAlwaysAvailable: false }));
    expect(result.current.pending).toMatchObject({ key: 'teachers_always_available', kind: 'plain' });
    act(() => result.current.cancel());
    expect(result.current.api.drafts.dirty('teachers_always_available')).toBe(false);
    apiSend.mockImplementation(answerPatch);
    act(() => result.current.api.apply('activity_retention_days', { activityRetentionDays: '30' }));
    expect(result.current.pending?.kind).toBe('typed');
    act(() => result.current.confirm('30'));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith(...patch('activity_retention_days', { value: 30, expectedVersion: 1, confirmText: '30' })),
    );
  });

  it('undo re-saves the previous value with the version the save answered', async () => {
    apiSend.mockImplementation(answerPatch);
    const { result } = setup();
    act(() => result.current.api.apply('fx_fresh_hours', { fxFreshHours: '6' }));
    await waitFor(() => expect(result.current.note).not.toBeNull());
    const note = result.current.note;
    if (note) act(() => result.current.undo(note));
    await waitFor(() => expect(apiSend).toHaveBeenLastCalledWith(...patch('fx_fresh_hours', { value: 24, expectedVersion: 2 })));
  });

  it('without the entries in the cache, the save reads them first (a failed read fails the save)', async () => {
    apiFetch.mockRejectedValue(new Error('down'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useValuesController({ settings: SETTINGS, meta: {}, canWrite: true, entries: [], describe: vi.fn() }), {
      wrapper,
    });
    act(() => result.current.api.apply('fx_fresh_hours', { fxFreshHours: '6' }));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours').state).toBe('failed'));
    expect(apiFetch).toHaveBeenCalledWith('/config/entries');
    expect(apiSend).not.toHaveBeenCalled();
  });
});
