import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { emptyTitle } from './empty-title';

const LIST = '0c000000-0000-4000-8000-000000000001';

describe('emptyTitle', () => {
  it('an empty chat list says how to fill it', () => {
    expect(emptyTitle({ page: 1, list: LIST })).toBe(t.inbox.lists.empty);
  });

  it('a list hidden by unread, a search or a status is not called empty', () => {
    expect(emptyTitle({ page: 1, list: LIST, unread: true })).toBe(t.inbox.emptyUnread);
    expect(emptyTitle({ page: 1, list: LIST, q: 'أحمد' })).toBe(t.inbox.empty);
    expect(emptyTitle({ page: 1, list: LIST, f_status: 'new' })).toBe(t.inbox.empty);
  });

  it('no list: «لا محادثات» or «لا غير مقروءة» as before', () => {
    expect(emptyTitle({ page: 1 })).toBe(t.inbox.empty);
    expect(emptyTitle({ page: 1, unread: true })).toBe(t.inbox.emptyUnread);
  });
});
