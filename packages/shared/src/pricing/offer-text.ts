// The calculator's «انسخ العرض للعميل» WhatsApp text (docs/08 §3), one line per item; the greeting
// and the package share the first line, as on the site.
// Labels come from ar.json: pass `ar.pricing` as `t`.
import { counted, type PluralForm } from '../format/plural.js';
import type { PackageId } from './catalog.js';
import type { CurrencyIso } from './currency.js';
import type { Quote } from './quote.js';

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

export function offerText(q: Quote, t: OfferLabels): string {
  const money = (n: number) => `${formatAmount(n)} ${t.currencies[q.currency]}`;
  const lines = [
    `${t.waIntro} ${packageLine(q, t)}`,
    `${t.studentsLabel}: ${q.students}`,
    `${t.total}: ${money(q.total)}`,
  ];
  if (q.discount > 0) {
    lines.push(
      `${t.discountLabel}: ${q.discount}%`,
      `${t.afterDiscount}: ${money(q.afterDiscount)}`,
    );
  }
  lines.push(t.trialNote);
  return lines.join('\n');
}
