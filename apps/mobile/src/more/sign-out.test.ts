import { supabase } from '@/core/lib/http/supabase';
import { unregisterPush } from '@/push/registerPush';
import { silencePush } from '@/push/silence-push';
import { signOutDevice, UNREGISTER_TIMEOUT_MS } from './sign-out';

jest.mock('@/push/registerPush', () => ({ unregisterPush: jest.fn() }));
jest.mock('@/push/silence-push', () => ({ silencePush: jest.fn() }));

const unregister = jest.mocked(unregisterPush);
const silence = jest.mocked(silencePush);
const signOut = jest.mocked(supabase.auth.signOut);

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.useRealTimers());

test('removes the push token first (it needs the session), silences the OS, then signs out', async () => {
  const order: string[] = [];
  unregister.mockImplementationOnce(async () => {
    order.push('unregister');
  });
  silence.mockImplementationOnce(async () => {
    order.push('silence');
  });
  signOut.mockImplementationOnce(async () => {
    order.push('signOut');
    return { error: null };
  });
  await signOutDevice();
  expect(order).toEqual(['unregister', 'silence', 'signOut']);
});

test('a hung DELETE cannot trap the admin: sign-out goes ahead after the timeout', async () => {
  jest.useFakeTimers();
  unregister.mockImplementationOnce(() => new Promise<void>(() => undefined));
  const done = signOutDevice();
  await jest.advanceTimersByTimeAsync(UNREGISTER_TIMEOUT_MS);
  await done;
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('offline (the DELETE fails): the device is still silenced, so the old account’s pushes stop', async () => {
  unregister.mockResolvedValueOnce(undefined);
  await signOutDevice();
  expect(silence).toHaveBeenCalledTimes(1);
  expect(signOut).toHaveBeenCalledTimes(1);
});
