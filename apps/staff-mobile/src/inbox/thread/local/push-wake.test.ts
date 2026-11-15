import { BackgroundNotificationTaskResult as Result } from 'expo-notifications';
import { isWakePush, onPushWake, type WakeDeps } from './push-wake';
import type { StoreWake } from './store-session';

// The background task's body (docs/43 §5): who it syncs for, and for how long.

/** What the task gets on Android / iOS: the push's data as `data.dataString`. */
const pushed = (data: unknown) => ({
  notification: null,
  data: { dataString: JSON.stringify(data), body: 'not read' },
});
const message = pushed({ kind: 'new_message', phone: '+966500000001' });

function fakes(over: Partial<WakeDeps> = {}) {
  const wake: StoreWake = {
    sync: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
  };
  const deps: WakeDeps = {
    signedIn: jest.fn(async () => 'user-a'),
    wake: jest.fn(async () => wake),
    budgetMs: 20_000,
    ...over,
  };
  return { deps, wake };
}

afterEach(() => jest.useRealTimers());

test('only a message push wakes the store', () => {
  expect([isWakePush(message), isWakePush(pushed({ kind: 'new_lead' }))]).toEqual([true, true]);
  expect(isWakePush(pushed({ kind: 'payment_due' }))).toBe(false);
  expect(isWakePush({ data: { dataString: '{not json' } })).toBe(false);
  // A tap (a notification response) or nothing at all.
  expect(isWakePush({ actionIdentifier: 'default', notification: {} })).toBe(false);
  expect(isWakePush(undefined)).toBe(false);
});

test('signed in, the store is theirs: one sync, released, NewData', async () => {
  const { deps, wake } = fakes();
  await expect(onPushWake(message, deps)).resolves.toBe(Result.NewData);
  expect(deps.wake).toHaveBeenCalledWith('user-a');
  expect([wake.sync, wake.release].map((f) => jest.mocked(f).mock.calls.length)).toEqual([1, 1]);
});

test('signed out: no store is touched', async () => {
  const { deps } = fakes({ signedIn: jest.fn(async () => undefined) });
  await expect(onPushWake(message, deps)).resolves.toBe(Result.NoData);
  expect(deps.wake).not.toHaveBeenCalled();
});

test('another owner (the store says no): nothing synced', async () => {
  const { deps } = fakes({ wake: jest.fn(async () => null) });
  await expect(onPushWake(message, deps)).resolves.toBe(Result.NoData);
});

test('another kind: not even the session is read', async () => {
  const { deps } = fakes();
  await expect(onPushWake(pushed({ kind: 'payment_due' }), deps)).resolves.toBe(Result.NoData);
  expect(deps.signedIn).not.toHaveBeenCalled();
});

test('a sync past the budget: Failed, the wake released (its request aborted)', async () => {
  jest.useFakeTimers();
  const { deps, wake } = fakes();
  jest.mocked(wake.sync).mockReturnValue(new Promise(() => undefined));
  const done = onPushWake(message, deps);
  await jest.advanceTimersByTimeAsync(20_000);
  await expect(done).resolves.toBe(Result.Failed);
  expect(wake.release).toHaveBeenCalledTimes(1);
});

test('a wake that opens only after the budget is let go of at once', async () => {
  jest.useFakeTimers();
  const { wake } = fakes();
  let open: (w: StoreWake) => void = () => undefined;
  const late = new Promise<StoreWake>((resolve) => (open = resolve));
  const { deps } = fakes({ wake: jest.fn(() => late) });
  const done = onPushWake(message, deps);
  await jest.advanceTimersByTimeAsync(20_000);
  await expect(done).resolves.toBe(Result.Failed);
  open(wake);
  await jest.advanceTimersByTimeAsync(0);
  expect([wake.sync, wake.release].map((f) => jest.mocked(f).mock.calls.length)).toEqual([0, 1]);
});

test('a session read that hangs (a token refresh offline) also ends at the budget', async () => {
  jest.useFakeTimers();
  const { deps } = fakes({ signedIn: () => new Promise(() => undefined) });
  const done = onPushWake(message, deps);
  await jest.advanceTimersByTimeAsync(20_000);
  await expect(done).resolves.toBe(Result.Failed);
});
