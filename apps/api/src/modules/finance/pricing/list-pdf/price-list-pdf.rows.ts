import {
  durationWords,
  formatAmount,
  MONTHLY,
  packageWords,
  type PriceList,
  type Quote,
} from '@ab/money';
import { ar } from '@/common/infra/i18n/server-text';
import type { PdfPackageCard, PdfPrice, PdfTierRow, PdfTone } from './price-list-pdf.types';

const isMonthly = (q: Quote): boolean => q.package === MONTHLY.id;
const isTier = (q: Quote): boolean => !isMonthly(q);

/** Read from the list as quote() priced it: nothing is priced or rounded here. */
function priceOf(q: Quote, list: PriceList): PdfPrice {
  const was = list.discount > 0 ? formatAmount(q.total) : null;
  return { now: formatAmount(q.afterDiscount), was };
}

const TONES = ['popular', 'featured'] as const;
const toneOf = (q: Quote): PdfTone => TONES.find((t) => q[t]) ?? null;

function rowOf(q: Quote, list: PriceList): PdfTierRow {
  const { name, sessions } = packageWords(q, ar.pricing);
  const cadence: Readonly<Record<string, string>> = ar.pricing.pdf.cadence;
  const prices = list.groups.map((g) => {
    const same = g.packages.find((p) => p.package === q.package);
    return same === undefined ? null : priceOf(same, list);
  });
  return {
    name,
    tagline: ar.pricing.packages[q.package].tagline,
    lessons: sessions,
    cadence: cadence[q.package] ?? '',
    tone: toneOf(q),
    prices,
  };
}

/** One row per package priced per lesson length, in the list's order; monthly gets a card. */
export function tierRows(list: PriceList): PdfTierRow[] {
  const first = list.groups[0]?.packages ?? [];
  return first.filter(isTier).map((q) => rowOf(q, list));
}

const lessonMinutes = (minutes: number): string =>
  ar.pricing.pdf.lessonMinutes.replace('{duration}', durationWords(minutes, ar.pricing));

export function weeklyCard(list: PriceList): PdfPackageCard {
  const w = ar.pricing.packages.weekly;
  const tile = { duration: lessonMinutes(list.weekly.duration), price: priceOf(list.weekly, list) };
  return { name: w.name, lessons: w.sessions, tagline: w.tagline, tiles: [tile] };
}

/** Null when no lesson length of the list has the monthly package. */
export function monthlyCard(list: PriceList): PdfPackageCard | null {
  const tiles = list.groups.flatMap((g) =>
    g.packages.filter(isMonthly).map((q) => ({
      duration: lessonMinutes(g.duration),
      price: priceOf(q, list),
    })),
  );
  const m = ar.pricing.packages.monthly;
  const card = { name: m.name, lessons: m.sessions, tagline: m.tagline, tiles };
  return tiles.length === 0 ? null : card;
}
