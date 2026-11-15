import { chatLiveKey } from '@ab/client-core';
import { renderHook } from '@testing-library/react-native';
import { inboxLive, useInboxLive, useLiveWatch } from './inbox-live';

// A chat screen that unmounts forgets its key: nothing of it stays in the registry (no leak, no refresh).

const PHONE = '+966500000001';

test('20 chat screens mounted and unmounted leave no watched or seen key and no store listener', async () => {
  for (let i = 0; i < 20; i += 1) {
    const hook = await renderHook(() => {
      useLiveWatch(chatLiveKey(`${PHONE.slice(0, -2)}${10 + i}`), true);
      return useInboxLive();
    });
    await hook.unmount();
  }
  const probe = { chat: jest.fn(), list: jest.fn(), badge: jest.fn() };
  const unbind = inboxLive.bind(probe);
  inboxLive.changed({ phone: PHONE });
  inboxLive.resync();
  const relisten = jest.fn();
  const unsubscribe = inboxLive.subscribe(relisten);
  unbind(); // setLive(false): no change, no listener call
  unsubscribe();
  expect([probe.chat.mock.calls.length, probe.list.mock.calls.length, relisten.mock.calls.length]).toEqual([0, 0, 0]);
});

test('a forgotten chat is not marked dirty: watching it again later fetches nothing extra', async () => {
  const hook = await renderHook(() => useLiveWatch(chatLiveKey(PHONE), false));
  await hook.unmount();
  const probe = { chat: jest.fn(), list: jest.fn(), badge: jest.fn() };
  const unbind = inboxLive.bind(probe);
  inboxLive.changed({ phone: PHONE });
  const release = inboxLive.watch(chatLiveKey(PHONE));
  release();
  inboxLive.forget(chatLiveKey(PHONE));
  unbind();
  expect(probe.chat).not.toHaveBeenCalled();
});
