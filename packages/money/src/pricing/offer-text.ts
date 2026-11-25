// The calculator's WhatsApp offer text (docs/08 §3); labels come from ar.json `ar.pricing`.
import { counted, type PluralForm } from '@ab/core';
import type { PackageId } from './catalog';
import type { CurrencyIso } from './currency';
import type { Quote } from './quote';

export interface OfferLabels {
  waIntro: string;
  packages: Readonly<Record<PackageId, { name: string; sessions: string }>> & {
    custom: { name: string };
  };
  customSessions: Readonly<Record<PluralForm, string>>;
  durations: Readonly<Record<string, string>>;
  currencies: Readonly<Record<CurrencyIso, string>>;
  perCircle: string;
  studentsLabel: string;
  total: string;
  discountLabel: string;
  afterDiscount: string;
  trialNote: string;
}

/** 1061 → "1,061", like the site's en-US formatter; no Intl so it also runs on Hermes. */
export function formatAmount(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function packageLine(q: Quote, t: OfferLabels): string {
  const name = q.package === 'custom' ? t.packages.custom.name : t.packages[q.package].name;
  const sessions =
    q.package === 'custom' ? counted(t.customSessions, q.lessons) : t.packages[q.package].sessions;
  return `${name} (${sessions} - ${t.durations[String(q.duration)] ?? q.duration} ${t.perCircle})`;
}

/** A custom `total` is the only total said, so the contradicting discount lines are dropped. */
export function offerText(q: Quote, t: OfferLabels, total?: number): string {
  const money = (n: number) => `${formatAmount(n)} ${t.currencies[q.currency]}`;
  const head = [`${t.waIntro} ${packageLine(q, t)}`, `${t.studentsLabel}: ${q.students}`];
  const priced = total === undefined ? pricedLines(q, t, money) : [`${t.total}: ${money(total)}`];
  return [...head, ...priced, t.trialNote].join('\n');
}

/** The calculator's total, then the discount and the price after it when there is one. */
function pricedLines(q: Quote, t: OfferLabels, money: (n: number) => string): string[] {
  const discounted = q.discount > 0;
  const discount = discounted
    ? [`${t.discountLabel}: ${q.discount}%`, `${t.afterDiscount}: ${money(q.afterDiscount)}`]
    : [];
  return [`${t.total}: ${money(q.total)}`, ...discount];
}
