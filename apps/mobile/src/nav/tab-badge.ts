import { t } from '@/core/lib/i18n/i18n';

const MAX = 99;

/** The Inbox tab's count: unread threads (new leads are threads too, never added), none at 0. */
export function badgeText(count: number | undefined): string | undefined {
  const total = count ?? 0;
  if (total <= 0) return undefined;
  return total > MAX ? t.mobileNav.badgeOverflow.replace('{n}', String(MAX)) : String(total);
}
