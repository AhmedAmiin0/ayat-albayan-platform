import { expect, test, vi } from 'vitest';
import { holdRoomOpen, isRoomOpen, subscribeRoomPresence } from './room-presence';

test('a held room counts until its cleanup runs, and listeners hear both', () => {
  const heard = vi.fn();
  const stop = subscribeRoomPresence(heard);
  expect(isRoomOpen()).toBe(false);
  const first = holdRoomOpen();
  const second = holdRoomOpen();
  first();
  expect(isRoomOpen()).toBe(true);
  second();
  expect(isRoomOpen()).toBe(false);
  expect(heard).toHaveBeenCalledTimes(4);
  stop();
  holdRoomOpen()();
  expect(heard).toHaveBeenCalledTimes(4);
});
