import {
  CHILD_TABS, childTabs, childTabWord, portalViewer, readsOwn, type ChildTab,
} from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { z } from 'zod';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** `?tab=` of a child's page (an alert opens the package): an unknown value is dropped. */
const tabSearch = z
  .object({ tab: z.enum(CHILD_TABS).optional() })
  .catch({});

type ChildSearch = z.infer<typeof tabSearch>;

export const parseChildSearch = (search: Record<string, unknown>): ChildSearch =>
  tabSearch.parse(search);

/** The page's tabs for this login with their words; no chat (family_chat_enabled is off). */
export function tabOptions(kind: PortalKind, student: PortalStudent) {
  const own = readsOwn(portalViewer(kind, student));
  return childTabs({ kind, student, chatOn: false }).map((value) => ({
    value,
    label: childTabWord(value, own, t),
  }));
}

/** The tab asked for when this login has it, else «القادمة». */
export const shownTab = (tabs: readonly { value: ChildTab }[], asked?: ChildTab): ChildTab =>
  tabs.some((tab) => tab.value === asked) && asked ? asked : 'upcoming';
