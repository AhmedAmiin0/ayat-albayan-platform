import { pathKey } from '@ab/client-core';
import type { LeadKeys, ThreadKeys } from './inbox.keys.types';

const threads = pathKey('/threads');
const leads = pathKey('/leads');

// Chats, lists and the badge sit under ['threads'], so every send refreshes them. The signed pdf
// pages and the GIPHY search sit outside it: a send must never sign or search again.
export const threadKeys: ThreadKeys = {
  all: threads,
  lists: [...threads, 'list'],
  navCount: [...threads, 'nav-count'],
  chat: (phone) => [...threads, phone],
  pdfPage: (phone, messageId, page) => ['thread-pdf', phone, messageId, page],
  gifs: (q) => ['gifs', q],
};

// The chat's lead panel sits under the leads root, so every lead write refreshes it too.
export const leadKeys: LeadKeys = {
  all: leads,
  lists: [...leads, 'list'],
  one: (id) => [...leads, id],
  byPhone: (phone) => [...leads, 'by-phone', phone],
};
