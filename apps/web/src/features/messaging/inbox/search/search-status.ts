import { searchCounter } from '@ab/client-core';
import { t } from '@/lib/i18n/i18n';
import type { ChatSearchValue } from './search-context';

type Phase = 'idle' | 'searching' | 'failed' | 'empty' | 'found';

const phaseOf = (s: ChatSearchValue): Phase => {
  const phases: [boolean, Phase][] = [
    [s.q === '', 'idle'],
    [s.searching, 'searching'],
    [s.failed, 'failed'],
    [s.total === 0, 'empty'],
  ];
  return phases.find(([on]) => on)?.[1] ?? 'found';
};

const TEXT: Record<Phase, (s: ChatSearchValue) => string> = {
  idle: () => '',
  searching: () => t.inbox.chatSearch.searching,
  failed: () => t.common.error,
  empty: () => t.inbox.chatSearch.empty,
  found: (s) => {
    const c = searchCounter(s.state.index, s.total);
    return t.inbox.chatSearch.counter.replace('{n}', String(c?.n)).replace('{m}', String(c?.m));
  },
};

/** The bar's line: «N من M», «لا توجد نتائج», «جارٍ البحث…», the load error or nothing yet. */
export const searchStatus = (s: ChatSearchValue): string => TEXT[phaseOf(s)](s);
