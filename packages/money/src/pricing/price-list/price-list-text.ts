import { durationWords, formatAmount, packageLine, packageWords } from '../offer-text';
import type { Quote } from '../quote';
import type { PriceList, PriceListGroup } from './price-list.schemas';
import type { PriceListLabels } from './price-list.types';

type Money = (amount: number) => string;

/** The discount and the students are said only when they change the prices below them. */
function headLines(list: PriceList, t: PriceListLabels): string[] {
  const discount =
    list.discount > 0 ? [t.listDiscount.replace('{pct}', String(list.discount))] : [];
  const students = list.students > 1 ? [`${t.studentsLabel}: ${list.students}`] : [];
  return [t.listIntro, ...discount, ...students];
}

function packageBullet(q: Quote, t: PriceListLabels, money: Money): string {
  const { name, sessions } = packageWords(q, t);
  return `• ${name} (${sessions}): ${money(q.afterDiscount)}`;
}

function groupLines(group: PriceListGroup, t: PriceListLabels, money: Money): string[] {
  const head = t.listDuration.replace('{duration}', durationWords(group.duration, t));
  return [head, ...group.packages.map((q) => packageBullet(q, t, money))];
}

/**
 * The price list as one WhatsApp message (docs/08 §3b): each price is the one after the discount,
 * so the discount is named once in the header instead of on every line.
 */
export function priceListText(list: PriceList, t: PriceListLabels): string {
  const money: Money = (amount) => `${formatAmount(amount)} ${t.currencies[list.currency]}`;
  const weekly = `${packageLine(list.weekly, t)}: ${money(list.weekly.afterDiscount)}`;
  const groups = list.groups.map((group) => groupLines(group, t, money));
  const blocks = [headLines(list, t), ...groups, [weekly], [t.trialNote]];
  return blocks.map((lines) => lines.join('\n')).join('\n\n');
}
