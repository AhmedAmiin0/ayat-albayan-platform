import { searchCounter } from './chat-search.js';

/** What the bar knows of its search. */
export interface SearchStatusInput {
  /** The settled words ('' = nothing asked yet). */
  q: string;
  searching: boolean;
  failed: boolean;
  total: number;
  index: number;
}

/** The app's words for the bar's line (i18n: inbox.chatSearch + common.error). */
export interface SearchStatusWords {
  searching: string;
  empty: string;
  /** «{n} من {m}». */
  counter: string;
  error: string;
}

type Phase = 'idle' | 'searching' | 'failed' | 'empty' | 'found';

const phaseOf = (s: SearchStatusInput): Phase => {
  const phases: [boolean, Phase][] = [
    [s.q === '', 'idle'],
    [s.searching, 'searching'],
    [s.failed, 'failed'],
    [s.total === 0, 'empty'],
  ];
  return phases.find(([on]) => on)?.[1] ?? 'found';
};

const TEXT: Record<Phase, (s: SearchStatusInput, w: SearchStatusWords) => string> = {
  idle: () => '',
  searching: (_, w) => w.searching,
  failed: (_, w) => w.error,
  empty: (_, w) => w.empty,
  found: (s, w) => {
    const c = searchCounter(s.index, s.total);
    return w.counter.replace('{n}', String(c?.n)).replace('{m}', String(c?.m));
  },
};

/** The bar's line: «N من M», «لا توجد نتائج», «جارٍ البحث…», the load error, or nothing yet. */
export const searchStatus = (s: SearchStatusInput, w: SearchStatusWords): string =>
  TEXT[phaseOf(s)](s, w);
