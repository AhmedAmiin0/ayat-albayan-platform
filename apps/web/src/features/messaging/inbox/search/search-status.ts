import { searchStatus as statusLine } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';
import type { ChatSearchValue } from './search-context';

/** The bar's line in this app's words (client-core's searchStatus). */
export const searchStatus = (s: ChatSearchValue): string =>
  statusLine({ ...s, index: s.state.index }, { ...t.inbox.chatSearch, error: t.common.error });
