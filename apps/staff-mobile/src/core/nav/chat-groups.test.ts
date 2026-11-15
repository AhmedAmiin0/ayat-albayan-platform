import { isThreadHref, overChat } from './chat-groups';

// The container's root state: expo-router's '__root' slot holds the root layout's stack.
const root = (...stack: string[]) => ({
  routes: [{ name: '__root', state: { index: stack.length - 1, routes: stack.map((name) => ({ name })) } }],
});

test.each(['(admin-chat)', '(sales-chat)', '(teacher-chat)'])('a chat group on top: over a chat (%s)', (group) => {
  expect(overChat(root('(tabs)', group))).toBe(true);
});

test.each([['(tabs)'], ['sales'], ['teacher'], ['assistant']])('a tree on top: not over a chat (%s)', (tree) => {
  expect(overChat(root(tree))).toBe(false);
  expect(overChat(root('(admin-chat)', tree))).toBe(false); // the group is under, not on top
});

test('no state yet (the navigator not ready), or an empty root: not over a chat', () => {
  expect(overChat(undefined)).toBe(false);
  expect(overChat({ routes: [] })).toBe(false);
  expect(overChat({ routes: [{ name: '__root' }] })).toBe(false);
});

test('a partial state (no index) reads its last route as the top', () => {
  const partial = { routes: [{ name: '__root', state: { routes: [{ name: 'sales' }, { name: '(sales-chat)' }] } }] };
  expect(overChat(partial)).toBe(true);
});

test.each(['/inbox/thread/%2B1', '/sales/inbox/thread/%2B1', '/teacher/chats/%2B1'])('%s is a chat', (href) => {
  expect(isThreadHref(href)).toBe(true);
});

test.each(['/inbox', '/inbox/a1', '/teacher/chats', '/students/s9', '/sales/more/earnings?view=payments', '/'])(
  '%s is not a chat',
  (href) => {
    expect(isThreadHref(href)).toBe(false);
  },
);
