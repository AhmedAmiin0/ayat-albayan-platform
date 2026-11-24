import type { NotificationsOverview, NumberView } from '@ab/shared';
import { createContext, useContext } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { NO_DRAFTS, type RuleDrafts } from './rule-drafts';

export interface RulesApi {
  canManage: boolean;
  numbers: readonly NumberView[];
  reach: NotificationsOverview['reach'];
  /** The page's toast (one polite status). */
  onSaved: (message: string) => void;
  /** Survives switching the audience and communications tabs. */
  drafts: RuleDrafts;
  /** Writes into the section's one always-mounted polite region (a row's failed save). */
  announce: (message: string) => void;
}

export const RulesContext = createContext<RulesApi>({
  canManage: false,
  numbers: [],
  reach: undefined,
  onSaved: () => undefined,
  drafts: NO_DRAFTS,
  announce: () => undefined,
});

export const useRules = (): RulesApi => useContext(RulesContext);

/** Null means the template's number; an id no longer listed reads as unspecified. */
export function numberName(numbers: readonly NumberView[], id: string | null): string {
  if (id === null) return t.notificationRules.templateNumber;
  return numbers.find((n) => n.id === id)?.label ?? t.common.unset;
}
