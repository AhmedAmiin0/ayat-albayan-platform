import { renderHook } from '@testing-library/react-native';
import type { RefObject } from 'react';
import type { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useAnchorJump } from './use-anchor-jump';
import type { LogTarget } from './use-thread-log';

// The list's side of the anchor: the hit is lit once its rows are in, once; leaving scrolls home.

interface Jump {
  anchored: boolean;
  target: LogTarget | null;
}

const ID = 'b2222222-2222-4222-8222-222222222222';

function setup() {
  const scrollToOffset = jest.fn();
  const list = { current: { scrollToOffset } } as unknown as RefObject<FlatList<unknown> | null>;
  const jump = jest.fn();
  return { list, jump, scrollToOffset };
}

test('jumps to the hit once its rows are ready, once per hit', async () => {
  const { list, jump } = setup();
  const hook = await renderHook(
    (p: { target: LogTarget | null }) =>
      useAnchorJump(list, { jump, anchored: true, target: p.target }),
    { initialProps: { target: { id: ID, ready: false } } },
  );
  expect(jump).not.toHaveBeenCalled();
  await hook.rerender({ target: { id: ID, ready: true } });
  await hook.rerender({ target: { id: ID, ready: true } });
  expect(jump).toHaveBeenCalledTimes(1);
  expect(jump).toHaveBeenCalledWith(ID, t.inbox.chatSearch.unreachable);
});

test('leaving the window returns the list to the newest message', async () => {
  const { list, jump, scrollToOffset } = setup();
  const hook = await renderHook(
    (p: { anchored: boolean }) => useAnchorJump(list, { jump, anchored: p.anchored, target: null }),
    { initialProps: { anchored: true } },
  );
  expect(scrollToOffset).not.toHaveBeenCalled();
  await hook.rerender({ anchored: false });
  expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: false });
});

test('from the window to a hit in the live chat: jumps to it, no scroll to the newest', async () => {
  const { list, jump, scrollToOffset } = setup();
  const LIVE = 'a1111111-1111-4111-8111-111111111111';
  const hook = await renderHook((p: Jump) => useAnchorJump(list, { jump, ...p }), {
    initialProps: { anchored: true, target: { id: ID, ready: true } },
  });
  await hook.rerender({ anchored: false, target: { id: LIVE, ready: true } });
  expect(jump).toHaveBeenLastCalledWith(LIVE, t.inbox.chatSearch.unreachable);
  expect(scrollToOffset).not.toHaveBeenCalled();
});

test('leaving to a hit not yet decided (target pending) still returns to the newest', async () => {
  const { list, jump, scrollToOffset } = setup();
  const hook = await renderHook((p: Jump) => useAnchorJump(list, { jump, ...p }), {
    initialProps: { anchored: true, target: { id: ID, ready: true } },
  });
  await hook.rerender({ anchored: false, target: { id: ID, ready: false } });
  expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: false });
});
