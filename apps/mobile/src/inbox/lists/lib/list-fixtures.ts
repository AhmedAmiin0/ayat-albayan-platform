import type { ChatList } from '@ab/shared';
import { thread } from '@/inbox/shared/thread-fixtures';

// Test data for the chat lists «القوائم» (docs/22): an assistant who holds inbox.lists, two lists.

export const PAID: ChatList = { id: 'l-paid', name: 'بانتظار الدفع', count: 1, auto_rule: null };
export const TRIAL: ChatList = { id: 'l-trial', name: 'تجريبية', count: 0, auto_rule: null };
export const SUBSCRIBED: ChatList = { id: 'l-sub', name: 'مشترك', count: 3, auto_rule: 'subscribed' };
export const TEACHERS: ChatList = { id: 'l-tch', name: 'معلم', count: 2, auto_rule: 'teachers' };

export const withLists = { role: 'sales', permissions: ['inbox.read', 'inbox.send', 'inbox.lists'] };
export const withoutLists = { role: 'sales', permissions: ['inbox.read', 'inbox.send'] };

export const page = (items = [thread]) => ({ items, total: items.length, page: 1, pageSize: 25 });

interface Backend {
  me: unknown;
  lists?: ChatList[];
  /** Anything else under /threads (the list pages, or a thread detail). */
  threads?: (path: string) => unknown;
}

/** A GET answerer for jest.mock('@/lib/api'): /auth/me, /chat-lists, then /threads… */
export function answer({ me, lists = [PAID, TRIAL], threads = () => page() }: Backend) {
  return async (path: string) => {
    if (path === '/auth/me') return me;
    if (path === '/chat-lists') return lists;
    if (path.startsWith('/threads')) return threads(path);
    return { open: true, reason: null, queued: 0 };
  };
}
