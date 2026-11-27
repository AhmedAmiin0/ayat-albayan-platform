import { mockCall } from '@ab/testing/mock-call';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderWithClient } from '@ab/web-kit/testing/query-render';
import type { PushEnv } from '@ab/web-kit/push/web-push-support';
import { WebPushToggle } from './WebPushToggle';

const READY: PushEnv = { hasServiceWorker: true, hasPushManager: true, hasNotification: true, permission: 'default', isIos: false, isStandalone: false };
const env = vi.hoisted(() => ({ current: {} as PushEnv }));
const push = vi.hoisted(() => ({
  rebindWebPush: vi.fn(),
  subscribeWebPush: vi.fn(),
  unsubscribeWebPush: vi.fn(),
}));
const mockApi = mockCall();
vi.mock('@ab/web-kit/push/web-push-support', async (orig) => ({ ...(await orig<object>()), readPushEnv: () => env.current }));
vi.mock('@ab/web-kit/push/web-push', () => push);
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

beforeEach(() => {
  vi.resetAllMocks();
  mockApi.reset();
  env.current = READY;
  mockApi.answer('GET', '/me/web-push/key', { publicKey: 'AQID' });
  push.rebindWebPush.mockResolvedValue(null);
});

describe('WebPushToggle: only explains when push cannot be used', () => {
  it.each([
    [{ ...READY, hasPushManager: false }, t.bell.push.unsupported],
    [{ ...READY, isIos: true }, t.bell.push.iosInstall],
    [{ ...READY, permission: 'denied' as const }, t.bell.push.denied],
  ])('%o', async (state, message) => {
    env.current = state;
    renderWithClient(<WebPushToggle />);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(mockApi.requests()).toEqual([]);
  });

  it('the server has no key: not configured', async () => {
    mockApi.answer('GET', '/me/web-push/key', { publicKey: null });
    renderWithClient(<WebPushToggle />);
    expect(await screen.findByText(t.bell.push.notConfigured)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('WebPushToggle: on / off', () => {
  it('off: never prompts by itself; the click subscribes with the server key', async () => {
    push.subscribeWebPush.mockResolvedValue('subscribed');
    renderWithClient(<WebPushToggle />);
    const enable = await screen.findByRole('button', { name: t.bell.push.enable });
    expect(screen.getByText(t.bell.push.off)).toBeTruthy();
    expect(push.subscribeWebPush).not.toHaveBeenCalled();
    fireEvent.click(enable);
    expect(mockApi.reads()).toEqual([{ method: 'GET', path: '/me/web-push/key' }]);
    await waitFor(() => expect(push.subscribeWebPush).toHaveBeenCalledWith('AQID'));
    expect(await screen.findByRole('button', { name: t.bell.push.disable })).toBeTruthy();
    expect(screen.getByText(t.bell.push.on)).toBeTruthy();
  });

  it('on: the click unsubscribes', async () => {
    push.rebindWebPush.mockResolvedValue({ endpoint: 'https://push.example/1' });
    push.unsubscribeWebPush.mockResolvedValue(undefined);
    renderWithClient(<WebPushToggle />);
    fireEvent.click(await screen.findByRole('button', { name: t.bell.push.disable }));
    expect(await screen.findByRole('button', { name: t.bell.push.enable })).toBeTruthy();
    expect(push.unsubscribeWebPush).toHaveBeenCalledTimes(1);
  });

  it('a refused prompt reads as blocked', async () => {
    push.subscribeWebPush.mockImplementation(async () => {
      env.current = { ...READY, permission: 'denied' };
      return 'denied';
    });
    renderWithClient(<WebPushToggle />);
    fireEvent.click(await screen.findByRole('button', { name: t.bell.push.enable }));
    expect(await screen.findByText(t.bell.push.denied)).toBeTruthy();
  });

  it('a failure says so and keeps the button', async () => {
    push.subscribeWebPush.mockRejectedValue(new Error('push service down'));
    renderWithClient(<WebPushToggle />);
    fireEvent.click(await screen.findByRole('button', { name: t.bell.push.enable }));
    expect((await screen.findByRole('alert')).textContent).toBe(t.bell.push.failed);
    expect(screen.getByRole('button', { name: t.bell.push.enable })).toBeTruthy();
  });
});
