import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { answerPatch, seedEntries } from '@/test/entries-fixture';
import { SETTINGS } from '@/test/settings-fixture';
import { useValuesController } from './use-values-controller';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  seedEntries(client);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useValuesController({ settings: SETTINGS, meta: {}, canWrite: true, entries: [], describe: vi.fn() }), { wrapper });
}

const CONFLICT = { code: 'conflict', key: 'fx_fresh_hours', current: 12, version: 5, updatedAt: '2026-10-23T10:00:00Z', updatedByName: 'سارة' };
const URL = '/config/entries/fx_fresh_hours';

afterEach(() => {
  apiSend.mockReset();
  apiFetch.mockReset();
});

describe('useValuesController — 409 conflict and 428', () => {
  it('409 conflict keeps the edit; «احفظ قيمتي» sends it again with the newer version', async () => {
    apiFetch.mockResolvedValue({});
    apiSend.mockRejectedValueOnce(new ApiError(409, CONFLICT)).mockImplementation(answerPatch);
    const { result } = setup();
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    act(() => result.current.api.save('fx_fresh_hours'));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours').state).toBe('conflict'));
    expect(result.current.api.status('fx_fresh_hours')).toMatchObject({ conflict: { current: 12, version: 5 }, mine: 6 });
    expect(result.current.api.drafts.dirty('fx_fresh_hours')).toBe(true);
    expect(result.current.note).toBeNull();
    // A new edit keeps the conflict (the choice is still pending).
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '7' }));
    expect(result.current.api.status('fx_fresh_hours').state).toBe('conflict');
    act(() => result.current.api.keepMine('fx_fresh_hours'));
    await waitFor(() => expect(result.current.note?.key).toBe('fx_fresh_hours'));
    expect(apiSend).toHaveBeenLastCalledWith('PATCH', URL, { value: 7, expectedVersion: 5 });
    expect(result.current.api.status('fx_fresh_hours').state).toBe('idle');
  });

  it('«اعتمد القيمة الجديدة» drops the edit and the conflict; nothing is sent', async () => {
    apiFetch.mockResolvedValue({});
    apiSend.mockRejectedValueOnce(new ApiError(409, CONFLICT));
    const { result } = setup();
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    act(() => result.current.api.save('fx_fresh_hours'));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours').state).toBe('conflict'));
    act(() => result.current.api.takeTheirs('fx_fresh_hours'));
    expect(result.current.api.status('fx_fresh_hours').state).toBe('idle');
    expect(result.current.api.drafts.dirty('fx_fresh_hours')).toBe(false);
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('428 without a typed text opens the typed confirmation; the typed text is then sent', async () => {
    apiSend.mockRejectedValueOnce(new ApiError(428, { code: 'confirmation_required' })).mockImplementation(answerPatch);
    const { result } = setup();
    // Lengthening asks nothing here, but the server's stored value is shorter: it asks (428).
    act(() => result.current.api.apply('activity_retention_days', { activityRetentionDays: '200' }));
    await waitFor(() => expect(result.current.pending).toMatchObject({ key: 'activity_retention_days', kind: 'typed', value: 200 }));
    act(() => result.current.confirm('٢٠٠'));
    await waitFor(() =>
      expect(apiSend).toHaveBeenLastCalledWith('PATCH', '/config/entries/activity_retention_days', {
        value: 200,
        expectedVersion: 1,
        confirmText: '٢٠٠',
      }),
    );
  });

  it('428 after a typed text (it did not match) is a failed save', async () => {
    apiSend.mockRejectedValue(new ApiError(428, { code: 'confirmation_required', message: 'mismatch' }));
    const { result } = setup();
    act(() => result.current.api.apply('activity_retention_days', { activityRetentionDays: '30' }));
    act(() => result.current.confirm('30'));
    await waitFor(() => expect(result.current.api.status('activity_retention_days')).toEqual({ state: 'failed', message: 'mismatch' }));
    expect(result.current.pending).toBeNull();
  });
});
