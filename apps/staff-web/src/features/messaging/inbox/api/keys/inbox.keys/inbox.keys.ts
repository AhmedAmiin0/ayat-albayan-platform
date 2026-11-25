import type { QueryKey } from '@tanstack/react-query';
import { leadKeys } from '@/features/sales/keys';
import type { InboxLeadKeys, ThreadKeys } from './inbox.keys.types';

const all = ['threads'] as const;
const lists = [...all, 'list'] as const;
const DETAIL = 'detail';

// Lists, chats and the nav badge sit under ['threads'], so a send or a lead write refreshes them
// all. The open chat's delta and the pdf pages sit outside it: a send must never rerun them.
export const threadKeys: ThreadKeys = {
  all,
  lists,
  navCount: [...all, 'nav-count'],
  list: (params) => [...lists, params],
  detail: (phone) => [...all, DETAIL, phone],
  delta: (phone) => ['thread-delta', phone],
  pdfPage: ({ phone, messageId, page }) => ['thread-pdf', phone, messageId, page],
};

// Under the leads root: every lead write refreshes the chat's lead panel too.
export const inboxLeadKeys: InboxLeadKeys = {
  byPhone: (phone) => [...leadKeys.all, 'by-phone', phone],
};

export const isThreadDetail = (key: QueryKey): boolean => key[1] === DETAIL;
