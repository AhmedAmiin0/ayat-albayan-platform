import { ROUNDING_MODES, type Rounding } from '@ab/money';
import { t, type FilterPill } from '@ab/mobile-kit';
import type { QuoteMode } from '@ab/client-core';

const q = t.inbox.quote;

export const MODES: readonly FilterPill<QuoteMode>[] = [
  { value: 'one', label: q.mode.one },
  { value: 'all', label: q.mode.all },
];
export const ROUNDINGS: readonly FilterPill<Rounding>[] = ROUNDING_MODES.map((value) => ({
  value,
  label: q.rounding[value],
}));
