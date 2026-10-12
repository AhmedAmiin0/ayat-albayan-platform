import type { NotificationsPage } from '@ab/shared';
import { t } from '@/lib/i18n';

// Pure helpers for the bell (R-NOT-01): the badge text and the optimistic «read» edit.

const BADGE_MAX = 9;

/** The bell's count: none at 0, «9+» above nine. */
export function bellBadge(unread: number): string | null {
  if (unread <= 0) return null;
  return unread > BADGE_MAX ? t.mobileNav.badgeOverflow.replace('{n}', String(BADGE_MAX)) : String(unread);
}

/** The bell's spoken name: «الإشعارات» or «الإشعارات، 3 غير مقروءة». */
export function bellLabel(unread: number): string {
  const bell = t.bell.mobile;
  return unread > 0 ? bell.openUnread.replace('{n}', String(unread)) : bell.open;
}

export interface MarkRead {
  /** The rows to mark; none = every unread row («تحديد الكل كمقروء»). */
  ids?: readonly string[];
  /** read_at to stamp (ISO). */
  at: string;
}

/** The page as it reads once these rows are read: read_at stamped, `unread` lowered to match. */
export function markedRead(page: NotificationsPage | undefined, mark: MarkRead): NotificationsPage | undefined {
  if (!page) return page;
  const hit = (id: string) => !mark.ids || mark.ids.includes(id);
  let newlyRead = 0;
  const items = page.items.map((item) => {
    if (item.read_at || !hit(item.id)) return item;
    newlyRead += 1;
    return { ...item, read_at: mark.at };
  });
  const unread = mark.ids ? Math.max(0, page.unread - newlyRead) : 0;
  return { ...page, items, unread };
}
