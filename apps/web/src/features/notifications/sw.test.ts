import { beforeEach, describe, expect, it, vi } from 'vitest';
import source from '../../../public/sw.js?raw';

// public/sw.js is plain JS served as is: run its text against a fake worker global.

type Handler = (event: object) => void;
const ORIGIN = 'https://app.test';
let handlers: Record<string, Handler>;
let worker: ReturnType<typeof fakeWorker>;

function fakeWorker() {
  return {
    location: { origin: ORIGIN, hostname: 'app.test' },
    registration: { showNotification: vi.fn(() => Promise.resolve()) },
    clients: { matchAll: vi.fn(), openWindow: vi.fn(() => Promise.resolve(null)) },
    addEventListener: (type: string, fn: Handler) => {
      handlers[type] = fn;
    },
  };
}

/** Fires `type` and waits for what the worker handed to waitUntil. */
async function fire(type: string, event: object): Promise<void> {
  let pending: Promise<unknown> = Promise.resolve();
  handlers[type]?.({ ...event, waitUntil: (p: Promise<unknown>) => (pending = p) });
  await pending;
}

const pushOf = (payload: unknown) => ({ data: { json: () => payload } });
const shown = () => worker.registration.showNotification.mock.calls[0] as unknown as [string, Record<string, unknown>];

beforeEach(() => {
  handlers = {};
  worker = fakeWorker();
  new Function('self', source)(worker);
});

describe('sw.js push', () => {
  it('shows title and body (direction from the text), with the same-origin url and the tag', async () => {
    await fire(
      'push',
      pushOf({ title: 'T', body: 'B', url: '/admin/inbox?phone=%2B966500000001', tag: 'lead-1' }),
    );
    const [title, options] = shown();
    expect(title).toBe('T');
    expect(options).toMatchObject({ body: 'B', tag: 'lead-1', icon: '/icon-192.png', dir: 'auto' });
    expect(options.data).toEqual({ url: `${ORIGIN}/admin/inbox?phone=%2B966500000001` });
  });

  it('never carries a foreign url: another origin or a javascript: url becomes the root', async () => {
    await fire('push', pushOf({ title: 'T', url: 'https://evil.example/x' }));
    await fire('push', pushOf({ title: 'T', url: 'javascript:alert(1)' }));
    const calls = worker.registration.showNotification.mock.calls as unknown as [string, { data: unknown }][];
    expect(calls.map(([, o]) => o.data)).toEqual([{ url: `${ORIGIN}/` }, { url: `${ORIGIN}/` }]);
  });

  it('tolerates a bad or missing payload', async () => {
    await fire('push', { data: { json: () => JSON.parse('{') } });
    await fire('push', {});
    expect(worker.registration.showNotification).toHaveBeenCalledTimes(2);
    expect(shown()[1]).toMatchObject({ body: '', data: { url: `${ORIGIN}/` } });
    // No UI text in the worker: a payload without a title shows the host name.
    expect(shown()[0]).toBe('app.test');
    expect(source).not.toMatch(/[\u0600-\u06FF]/);
    expect(shown()[1]).not.toHaveProperty('tag');
  });
});

describe('sw.js notificationclick', () => {
  const click = (url: unknown) => ({ notification: { close: vi.fn(), data: { url } } });

  it('focuses an open tab of the app and navigates it', async () => {
    const tab = { url: `${ORIGIN}/admin`, focus: vi.fn(() => Promise.resolve()), navigate: vi.fn(() => Promise.resolve()) };
    worker.clients.matchAll.mockResolvedValue([{ url: 'https://other.test/' }, tab]);
    const event = click(`${ORIGIN}/admin/students`);
    await fire('notificationclick', event);
    expect(event.notification.close).toHaveBeenCalled();
    expect(tab.focus).toHaveBeenCalled();
    expect(tab.navigate).toHaveBeenCalledWith(`${ORIGIN}/admin/students`);
    expect(worker.clients.openWindow).not.toHaveBeenCalled();
  });

  it('opens a window when no tab is open, or when the tab cannot be navigated', async () => {
    worker.clients.matchAll.mockResolvedValue([]);
    await fire('notificationclick', click('https://evil.example/'));
    expect(worker.clients.openWindow).toHaveBeenCalledWith(`${ORIGIN}/`);
    const stale = { url: `${ORIGIN}/`, focus: vi.fn(() => Promise.resolve()), navigate: vi.fn(() => Promise.reject(new TypeError('uncontrolled'))) };
    worker.clients.matchAll.mockResolvedValue([stale]);
    await fire('notificationclick', click('/teacher'));
    expect(worker.clients.openWindow).toHaveBeenLastCalledWith(`${ORIGIN}/teacher`);
  });
});
