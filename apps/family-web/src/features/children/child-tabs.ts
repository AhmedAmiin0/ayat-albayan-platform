import {
  CHILD_TABS, childTabPill, childTabs, portalViewer, readsOwn, type ChildTab, type ChildTabPill,
} from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { z } from 'zod';
import type { TabOption } from '@ab/web-kit';
import { t } from '@ab/web-kit';

/** `?tab=` of a child's page (an alert opens the package or the chat): unknown values drop. */
const tabSearch = z
  .object({ tab: z.enum(CHILD_TABS).optional() })
  .catch({});

type ChildSearch = z.infer<typeof tabSearch>;

export const parseChildSearch = (search: Record<string, unknown>): ChildSearch =>
  tabSearch.parse(search);

/** Shown while family_chat_enabled is on, with the child's unread count. */
export interface ChatTab {
  on: boolean;
  unread: number;
}

const NO_CHAT: ChatTab = { on: false, unread: 0 };

/** The unread badge while there is one (none at 0, as on the family app). */
const shownBadge = (pill: ChildTabPill) =>
  pill.badge && pill.badge.count > 0 ? pill.badge : undefined;

/** A pill as a web tab: the unread badge after the word, the tab named with it. */
function tabOption(pill: ChildTabPill): TabOption<ChildTab> {
  const badge = shownBadge(pill);
  return { value: pill.value, label: pill.label, badge: badge?.count, ariaLabel: badge?.label };
}

/** Chat last while the chat is on. */
export function tabOptions(kind: PortalKind, student: PortalStudent, chat: ChatTab = NO_CHAT) {
  const own = readsOwn(portalViewer(kind, student));
  return childTabs({ kind, student, chatOn: chat.on }).map((value) =>
    tabOption(childTabPill(value, { own, unread: chat.unread }, t)),
  );
}

/** The tab asked for when this login has it, else the upcoming tab. */
export const shownTab = (tabs: readonly { value: ChildTab }[], asked?: ChildTab): ChildTab =>
  tabs.some((tab) => tab.value === asked) && asked ? asked : 'upcoming';
