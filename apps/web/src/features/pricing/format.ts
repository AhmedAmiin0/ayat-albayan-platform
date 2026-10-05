import { counted, formatAmount, type Quote } from '@ab/shared';
import { formatDate } from '@/features/leads/format';
import { t } from '@/lib/i18n';
import type { FxRate } from './api';

// Display text for a quote. Wording from ar.json (the site's copy, Western digits).

const durations: Readonly<Record<string, string>> = t.pricing.durations;

/** «45 دقيقة»; weekly comes back as 90. */
export function durationLabel(minutes: number): string {
  // a pro-rated payout line (pay-rule) can be any length: «50 دقيقة»
  return durations[String(minutes)] ?? t.earnings.minutes.replace('{count}', String(minutes));
}

/** «12 حلقة», or the counted form for a custom count («حلقتان», «7 حلقات»). */
export function sessionsOf(q: Pick<Quote, 'package' | 'lessons'>): string {
  return q.package === 'custom'
    ? counted(t.pricing.customSessions, q.lessons)
    : t.pricing.packages[q.package].sessions;
}

/** Name + tagline of a site package or «باقة مخصّصة». */
export function packageCopy(id: Quote['package']): { name: string; tagline: string } {
  return t.pricing.packages[id];
}

/** «3 مرات» (lessons a week, the site's wording); none for a custom count. */
export function frequencyOf(id: Quote['package']): string | null {
  return id === 'custom' ? null : t.pricing.frequencies[id];
}

/** The line under a USD price (docs/08 §4): the peg fallback, an older stored rate, or the rate's date. */
export function fxLine(fx: FxRate): string {
  if (fx.fallback) return t.pricing.fx.fallback;
  const line = fx.ageHours === null ? t.pricing.fx.rateDate : t.pricing.fx.stale;
  return line.replace('{date}', formatDate(fx.date));
}

/** The polite live-region line: the package, its price, and the final total when it differs. */
export function quoteSummary(q: Quote): string {
  const money = (n: number) => `${formatAmount(n)} ${t.pricing.currencies[q.currency]}`;
  const head = `${packageCopy(q.package).name} (${sessionsOf(q)}): ${money(q.price)}`;
  if (q.students === 1 && q.discount === 0) return head;
  const label = q.discount > 0 ? t.pricing.afterDiscount : t.pricing.total;
  return `${head}${t.common.listSeparator}${label}: ${money(q.afterDiscount)}`;
}

/** wa.me with no number: WhatsApp asks whom to send the offer to. */
export function waLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
