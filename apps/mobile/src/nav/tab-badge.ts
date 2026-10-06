import { t } from '@/lib/i18n';

const MAX = 99;

/** The Inbox tab's count: unread threads plus new leads (the web's two saffron «دورك» counts), none at 0. */
export function badgeText(...counts: readonly (number | undefined)[]): string | undefined {
  const total = counts.reduce<number>((sum, n) => sum + (n ?? 0), 0);
  if (total <= 0) return undefined;
  return total > MAX ? t.mobileNav.badgeOverflow.replace('{n}', String(MAX)) : String(total);
}
