import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient } from '../notifications-test-kit';
import type { PushEnv } from './web-push-support';
import { WebPushToggle } from './WebPushToggle';

const READY: PushEnv = { hasServiceWorker: true, hasPushManager: true, hasNotification: true, permission: 'default', isIos: false, isStandalone: false };
const env = vi.hoisted(() => ({ current: {} as PushEnv }));
const push = vi.hoisted(() => ({ rebindWebPush: vi.fn(), subscribeWebPush: vi.fn(), unsubscribeWebPush: vi.fn() }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('./web-push-support', async (orig) => ({ ...(await orig<object>()), readPushEnv: () => env.current }));
vi.mock('./web-push', () => push);
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

beforeEach(() => {
  vi.resetAllMocks();
  env.current = READY;
  apiFetch.mockResolvedValue({ publicKey: 'AQID' });
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
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('the server has no key: not configured', async () => {
    apiFetch.mockResolvedValue({ publicKey: null });
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
    expect(apiFetch).toHaveBeenCalledWith('/me/web-push/key');
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
