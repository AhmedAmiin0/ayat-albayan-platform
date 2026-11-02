import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { base64UrlToBytes, FORGET_TIMEOUT_MS, forgetWebPush, rebindWebPush, subscribeWebPush, unsubscribeWebPush } from './web-push';

const api = vi.hoisted(() => ({ saveWebPush: vi.fn(), deleteWebPush: vi.fn() }));
vi.mock('@/features/messaging/notifications/api', () => api);

const JSON_SUB = { endpoint: 'https://push.example/abc', expirationTime: null, keys: { p256dh: 'p', auth: 'a' } };
const sub = { endpoint: JSON_SUB.endpoint, toJSON: () => JSON_SUB, unsubscribe: vi.fn() };
const pushManager = { getSubscription: vi.fn(), subscribe: vi.fn() };
const registration = { pushManager };
const sw = { register: vi.fn(), ready: Promise.resolve(registration), getRegistration: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  sw.getRegistration.mockResolvedValue(registration);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  vi.stubGlobal('Notification', { requestPermission: vi.fn() });
});
afterEach(() => {
  Reflect.deleteProperty(navigator, 'serviceWorker');
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('base64UrlToBytes', () => {
  it('decodes unpadded base64url', () => {
    expect(Array.from(base64UrlToBytes('_-8'))).toEqual([0xff, 0xef]);
    expect(Array.from(base64UrlToBytes('AQID'))).toEqual([1, 2, 3]);
  });
});

describe('subscribeWebPush', () => {
  it('asks, registers /sw.js, subscribes with the key and saves the subscription', async () => {
    vi.mocked(Notification.requestPermission).mockResolvedValue('granted');
    pushManager.getSubscription.mockResolvedValue(null);
    pushManager.subscribe.mockResolvedValue(sub);
    await expect(subscribeWebPush('AQID')).resolves.toBe('subscribed');
    expect(sw.register).toHaveBeenCalledWith('/sw.js');
    const opts = pushManager.subscribe.mock.calls[0]?.[0];
    expect(opts.userVisibleOnly).toBe(true);
    expect(Array.from(opts.applicationServerKey)).toEqual([1, 2, 3]);
    expect(api.saveWebPush).toHaveBeenCalledWith(JSON_SUB);
  });

  it('stops at a refused prompt without touching the worker', async () => {
    vi.mocked(Notification.requestPermission).mockResolvedValue('denied');
    await expect(subscribeWebPush('AQID')).resolves.toBe('denied');
    expect(sw.register).not.toHaveBeenCalled();
    expect(api.saveWebPush).not.toHaveBeenCalled();
  });
});

describe('rebindWebPush', () => {
  it('PUTs an existing subscription again (bound to this session), never prompts; a failed PUT is quiet', async () => {
    pushManager.getSubscription.mockResolvedValue(sub);
    api.saveWebPush.mockRejectedValue(new Error('offline'));
    await expect(rebindWebPush()).resolves.toBe(sub);
    expect(api.saveWebPush).toHaveBeenCalledWith(JSON_SUB);
    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it('none: nothing sent', async () => {
    pushManager.getSubscription.mockResolvedValue(null);
    await expect(rebindWebPush()).resolves.toBeNull();
    expect(api.saveWebPush).not.toHaveBeenCalled();
  });
});

describe('unsubscribeWebPush', () => {
  it('deletes on the server, then unsubscribes', async () => {
    pushManager.getSubscription.mockResolvedValue(sub);
    await unsubscribeWebPush();
    expect(api.deleteWebPush).toHaveBeenCalledWith(JSON_SUB.endpoint);
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('keeps the subscription when the API fails', async () => {
    pushManager.getSubscription.mockResolvedValue(sub);
    api.deleteWebPush.mockRejectedValue(new Error('down'));
    await expect(unsubscribeWebPush()).rejects.toThrow('down');
    expect(sub.unsubscribe).not.toHaveBeenCalled();
  });
});

describe('forgetWebPush (sign-out)', () => {
  it('unsubscribes even when the API fails, and never throws', async () => {
    pushManager.getSubscription.mockResolvedValue(sub);
    api.deleteWebPush.mockRejectedValue(new Error('down'));
    await expect(forgetWebPush()).resolves.toBeUndefined();
    expect(sub.unsubscribe).toHaveBeenCalled();
  });

  it('gives up after the timeout', async () => {
    vi.useFakeTimers();
    sw.getRegistration.mockImplementation(() => new Promise(() => undefined));
    const run = forgetWebPush();
    await vi.advanceTimersByTimeAsync(FORGET_TIMEOUT_MS);
    await expect(run).resolves.toBeUndefined();
  });

  it('does nothing without service workers', async () => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
    await forgetWebPush();
    expect(api.deleteWebPush).not.toHaveBeenCalled();
  });
});
