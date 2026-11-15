import { homeState } from './home-state';
import { childHref, ownStudent } from './portal-me';

const child = { id: 's1', code: 'AB-0001', name: 'سارة' };

test('loading, error, empty and list from /portal/me', () => {
  expect(homeState({ data: undefined, isError: false })).toBe('loading');
  expect(homeState({ data: undefined, isError: true })).toBe('error');
  expect(homeState({ data: { kind: 'guardian', students: [] }, isError: false })).toBe('empty');
  // Cached cards stay on screen when a refetch fails (offline).
  expect(homeState({ data: { kind: 'guardian', students: [child] }, isError: true })).toBe('list');
});

test('a student goes to their own page; a guardian stays on the list', () => {
  expect(ownStudent({ kind: 'student', students: [child] })).toEqual(child);
  expect(ownStudent({ kind: 'guardian', students: [child] })).toBeNull();
  expect(ownStudent({ kind: 'student', students: [] })).toBeNull();
  expect(childHref('s 1')).toBe('/child/s%201');
});
