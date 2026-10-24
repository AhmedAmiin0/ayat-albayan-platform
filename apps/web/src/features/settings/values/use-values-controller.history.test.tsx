import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { answerPatch, seedEntries } from '@/test/entries-fixture';
import { SETTINGS } from '@/test/settings-fixture';
import { useValuesController } from './use-values-controller';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  seedEntries(client);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useValuesController({ settings: SETTINGS, meta: {}, canWrite: true, entries: [], describe: vi.fn() }), { wrapper });
}

afterEach(() => apiSend.mockReset());

describe('useValuesController — failed saves and the previous value', () => {
  it('«تراجع» (discard) or a new edit ends a failed save', async () => {
    apiSend.mockRejectedValue(new ApiError(500, null));
    const { result } = setup();
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    act(() => result.current.api.save('fx_fresh_hours'));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours').state).toBe('failed'));
    act(() => result.current.api.drafts.discard('fx_fresh_hours'));
    expect(result.current.api.status('fx_fresh_hours').state).toBe('idle');

    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '7' }));
    act(() => result.current.api.save('fx_fresh_hours'));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours').state).toBe('failed'));
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '8' }));
    expect(result.current.api.status('fx_fresh_hours').state).toBe('idle');
  });

  it('a save keeps the value it replaced and when it landed; a refused one keeps nothing', async () => {
    const { result } = setup();
    expect(result.current.api.previous('fx_fresh_hours')).toBeUndefined();
    apiSend.mockRejectedValueOnce(new ApiError(500, null));
    act(() => result.current.api.apply('fx_fresh_hours', { fxFreshHours: '6' }));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours').state).toBe('failed'));
    expect(result.current.api.savedAt('fx_fresh_hours')).toBeUndefined();
    apiSend.mockImplementation(answerPatch);
    act(() => result.current.api.save('fx_fresh_hours'));
    await waitFor(() => expect(result.current.api.savedAt('fx_fresh_hours')).toBeTypeOf('number'));
    expect(result.current.api.previous('fx_fresh_hours')).toEqual({ value: SETTINGS.fx_fresh_hours });
  });

  it('a key the API answers 422 invalid is a failed save: the edit stays, nothing is noted', async () => {
    apiSend.mockRejectedValue(new ApiError(422, { code: 'invalid' }));
    const { result } = setup();
    act(() => result.current.api.drafts.edit('fx_fresh_hours', { fxFreshHours: '6' }));
    act(() => result.current.api.save('fx_fresh_hours'));
    await waitFor(() => expect(result.current.api.status('fx_fresh_hours').state).toBe('failed'));
    expect(result.current.api.drafts.dirty('fx_fresh_hours')).toBe(true);
    expect(result.current.note).toBeNull();
    expect(result.current.api.savedAt('fx_fresh_hours')).toBeUndefined();
  });

  it('lengthening a retention period saves without the typed confirmation', async () => {
    apiSend.mockImplementation(answerPatch);
    const { result } = setup();
    act(() => result.current.api.apply('activity_retention_days', { activityRetentionDays: String(SETTINGS.activity_retention_days + 10) }));
    expect(result.current.pending).toBeNull();
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(1));
  });
});
