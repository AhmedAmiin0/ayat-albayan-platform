import { PAID, TRIAL } from './list-fixtures';
import { listsOf } from './use-chat-lists';

test('no cached answer yet reads as no lists', () => {
  expect(listsOf(undefined)).toEqual([]);
});

test('the cached lists are kept as they are, in order', () => {
  expect(listsOf([PAID, TRIAL])).toEqual([PAID, TRIAL]);
});
