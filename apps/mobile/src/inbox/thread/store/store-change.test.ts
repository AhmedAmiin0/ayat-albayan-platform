import { changedPhones, touches } from './store-change';
import { A, B, plan, row, threadRow } from './store-fixtures';

test('a plan touches its rows’ chats, its chats-list rows and the removed rows’ chats', () => {
  const removed = [{ id: 'x', phone: '+966500000003', updated_at: 't' }];
  const change = changedPhones(plan([row({ n: 1 })], { threads: [threadRow(B, 2)] }), removed);
  expect(change).toEqual(new Set([A, B, '+966500000003']));
  expect([touches(change, A), touches(change, '+966500000009')]).toEqual([true, false]);
});

test('a reset touches every chat', () => {
  const change = changedPhones(plan([], { reset: true }), []);
  expect(change).toBe('all');
  expect(touches(change, A)).toBe(true);
});
