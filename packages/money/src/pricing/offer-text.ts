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

/** A package's name and lesson count in words; a custom count follows the plural rules. */
export function packageWords(
  q: Quote,
  t: Pick<OfferLabels, 'packages' | 'customSessions'>,
): { name: string; sessions: string } {
  if (q.package !== 'custom') return t.packages[q.package];
  return { name: t.packages.custom.name, sessions: counted(t.customSessions, q.lessons) };
}

/** A lesson duration in words; one without a label stays its minutes. */
export function durationWords(minutes: number, t: Pick<OfferLabels, 'durations'>): string {
  return t.durations[String(minutes)] ?? String(minutes);
}

/** The package as the offer and the price list name it: name, lessons, minutes per lesson. */
export function packageLine(
  q: Quote,
  t: Pick<OfferLabels, 'packages' | 'customSessions' | 'durations' | 'perCircle'>,
): string {
  const { name, sessions } = packageWords(q, t);
  return `${name} (${sessions} - ${durationWords(q.duration, t)} ${t.perCircle})`;
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
