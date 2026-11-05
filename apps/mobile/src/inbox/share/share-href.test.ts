import type { Permission } from '@ab/shared';
import { shareHome, shareHref } from './share-href';

const all = () => true;
const without = (missing: Permission) => (p: Permission) => p !== missing;

test('each tree gets its own chooser', () => {
  expect(shareHref('admin', all)).toBe('/inbox/share');
  expect(shareHref('sales', all)).toBe('/sales/inbox/share');
  expect(shareHref('teacher', all)).toBe('/teacher/chats/share');
});

test('a salesperson without the chats, the assistant and no session: nowhere to share', () => {
  expect(shareHref('sales', without('inbox.read'))).toBeNull();
  expect(shareHref('assistant', all)).toBeNull();
  expect(shareHref('out', all)).toBeNull();
  expect(shareHref('booting', all)).toBeNull();
});

test('«رجوع» stays in the tree: the assistant to its lessons, never the admin-only tabs', () => {
  expect(shareHome('assistant')).toBe('/assistant/lessons');
  expect(shareHome('sales')).toBe('/sales/more');
  expect(shareHome('admin')).toBe('/');
});
