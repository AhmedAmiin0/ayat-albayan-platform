import { SETTING_DEFAULTS, type AcademySettings } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSettingSwitch, type SettingSwitchOptions } from './use-setting-switch';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('../http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const NEXT: AcademySettings = { ...SETTING_DEFAULTS, sales_auto_assign: true };

function setup(opts?: SettingSwitchOptions) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useSettingSwitch(opts), { wrapper });
  return { client, invalidate, result };
}

afterEach(() => apiSend.mockReset());

describe('useSettingSwitch', () => {
  it('one PATCH /settings, the answer into [settings], then onSaved; no other key is invalidated', async () => {
    apiSend.mockResolvedValue(NEXT);
    const order: string[] = [];
    const onSaved = vi.fn(() => {
      order.push('saved');
    });
    const { client, invalidate, result } = setup({ onSaved });
    const set = vi.spyOn(client, 'setQueryData').mockImplementation((...args) => {
      order.push('set');
      return QueryClient.prototype.setQueryData.apply(client, args);
    });
    act(() => result.current.mutate({ salesAutoAssign: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiSend).toHaveBeenCalledTimes(1);
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/settings', { salesAutoAssign: true });
    expect(set).toHaveBeenCalledWith(['settings'], NEXT);
    expect(client.getQueryData(['settings'])).toEqual(NEXT);
    expect(onSaved).toHaveBeenCalledWith(NEXT);
    expect(order).toEqual(['set', 'saved']);
    // Today's behaviour, pinned: the switches never refresh ['config','meta'] or ['settings','public'].
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('works without options and waits for an async onSaved before settling', async () => {
    apiSend.mockResolvedValue(NEXT);
    const plain = setup();
    act(() => plain.result.current.mutate({ feedbackMode: 'link' }));
    await waitFor(() => expect(plain.result.current.isSuccess).toBe(true));
    expect(plain.client.getQueryData(['settings'])).toEqual(NEXT);
    let release: () => void = () => undefined;
    const onSaved = vi.fn(
      () =>
        new Promise<void>((r) => {
          release = r;
        }),
    );
    const slow = setup({ onSaved });
    act(() => slow.result.current.mutate({ messagingEnabled: true }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(slow.result.current.isPending).toBe(true);
    act(() => release());
    await waitFor(() => expect(slow.result.current.isSuccess).toBe(true));
  });

  it('a failed PATCH leaves the cache alone and skips onSaved', async () => {
    apiSend.mockRejectedValue(new Error('down'));
    const onSaved = vi.fn();
    const { client, result } = setup({ onSaved });
    act(() => result.current.mutate({ autoMessagesEnabled: true }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(['settings'])).toBeUndefined();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
