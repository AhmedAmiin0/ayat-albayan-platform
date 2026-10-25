import { t } from '@/core/lib/i18n/i18n';
import { threadsEmptyTitle } from './threads-empty';

test('an empty chat list says how to fill it', () => {
  expect(threadsEmptyTitle({ listId: 'l-1', filter: 'all', search: '' })).toBe(t.inbox.lists.empty);
});

test('a list hidden by «غير المقروءة» or a search is not called empty', () => {
  expect(threadsEmptyTitle({ listId: 'l-1', filter: 'unread', search: '' })).toBe(t.inbox.emptyUnread);
  expect(threadsEmptyTitle({ listId: 'l-1', filter: 'all', search: 'أحمد' })).toBe(t.inbox.empty);
});

test('no list: as before', () => {
  expect(threadsEmptyTitle({ listId: null, filter: 'all', search: '' })).toBe(t.inbox.empty);
  expect(threadsEmptyTitle({ listId: null, filter: 'unread', search: '' })).toBe(t.inbox.emptyUnread);
});
