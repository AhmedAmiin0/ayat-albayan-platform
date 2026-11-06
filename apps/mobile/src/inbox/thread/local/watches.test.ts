import { createListeners, createWatches } from './watches';

test('a key stays while watched; the last release drops it once; a double release counts once', () => {
  const dropped = jest.fn();
  const w = createWatches(dropped);
  const a = w.add('x');
  const b = w.add('x');
  a();
  a();
  expect([w.has('x'), w.keys()]).toEqual([true, ['x']]);
  b();
  expect([w.has('x'), dropped.mock.calls]).toEqual([false, [['x']]]);
});

test('listeners: each told until it leaves', () => {
  const l = createListeners();
  const heard = jest.fn();
  const off = l.subscribe(heard);
  l.tell();
  off();
  l.tell();
  expect(heard).toHaveBeenCalledTimes(1);
});
