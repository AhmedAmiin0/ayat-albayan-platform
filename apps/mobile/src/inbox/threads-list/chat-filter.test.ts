import type { ThreadView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { thread } from '../shared/thread-fixtures';
import { choiceQuery, threadsEmptyTitle, waitingForReply } from './chat-filter';

const list = { list: 'l-1' };

test('an empty chat list says how to fill it', () => {
  expect(threadsEmptyTitle(list, '')).toBe(t.inbox.lists.empty);
});

test('a list hidden by a search is not called empty', () => {
  expect(threadsEmptyTitle(list, 'أحمد')).toBe(t.inbox.empty);
});

test('every other choice has its own empty title', () => {
  expect(threadsEmptyTitle('all', '')).toBe(t.inbox.empty);
  expect(threadsEmptyTitle('unread', '')).toBe(t.inbox.emptyUnread);
  expect(threadsEmptyTitle('waiting', '')).toBe(t.inbox.emptyWaiting);
  expect(threadsEmptyTitle({ stage: 'trial_booked' }, '')).toBe(t.inbox.emptyStage);
});

test('each choice asks GET /threads for its own filter; «بانتظار ردّك» asks for every chat', () => {
  expect(choiceQuery('all')).toEqual({ unread: false });
  expect(choiceQuery('waiting')).toEqual({ unread: false });
  expect(choiceQuery('unread')).toEqual({ unread: true });
  expect(choiceQuery(list)).toEqual({ unread: false, list: 'l-1' });
  expect(choiceQuery({ stage: 'no_reply' })).toEqual({ unread: false, status: 'no_reply' });
});

test('«بانتظار ردّك»: only chats whose last message is inbound, the newest wait first', () => {
  const at = (phone: string, iso: string, dir: ThreadView['last_direction']): ThreadView => ({
    ...thread,
    phone_e164: phone,
    last_message_at: iso,
    last_direction: dir,
  });
  const old = at('+1', '2026-10-29T08:00:00Z', 'inbound');
  const answered = at('+2', '2026-10-29T10:00:00Z', 'outbound');
  const fresh = at('+3', '2026-10-29T09:30:00Z', 'inbound');
  expect(waitingForReply([old, answered, fresh]).map((th) => th.phone_e164)).toEqual(['+3', '+1']);
});
