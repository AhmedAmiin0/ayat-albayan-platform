import { detail } from '../thread-fixtures';
import type { ThreadCache } from '../thread-cache';
import { undoChange, withMembership } from './use-list-membership';

const paid = { id: 'l-1', name: 'بانتظار الدفع' };
const trial = { id: 'l-2', name: 'تجريبية' };

function cache(lists: { id: string; name: string }[]): ThreadCache {
  return { pages: [{ ...detail([]), lists }, detail([])], pageParams: [undefined, 'x'] };
}

test('adding puts the list on the newest page only, once', () => {
  const out = withMembership(cache([trial]), { list: paid, member: true });
  expect(out?.pages[0]?.lists).toEqual([trial, paid]);
  expect(out?.pages[1]?.lists).toBeUndefined();
  expect(withMembership(out, { list: paid, member: true })?.pages[0]?.lists).toEqual([trial, paid]);
});

test('removing takes it out; removing a non-member changes nothing', () => {
  expect(withMembership(cache([trial, paid]), { list: paid, member: false })?.pages[0]?.lists).toEqual([trial]);
  expect(withMembership(cache([trial]), { list: paid, member: false })?.pages[0]?.lists).toEqual([trial]);
});

test('no cached thread: nothing to edit', () => {
  expect(withMembership(undefined, { list: paid, member: true })).toBeUndefined();
});

test('undoing a failed toggle keeps a later toggle of another list', () => {
  const both = withMembership(withMembership(cache([]), { list: paid, member: true }), { list: trial, member: true });
  expect(withMembership(both, undoChange({ list: paid, member: true }))?.pages[0]?.lists).toEqual([trial]);
  expect(withMembership(cache([trial]), undoChange({ list: trial, member: false }))?.pages[0]?.lists).toEqual([trial]);
});
