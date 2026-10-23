import type { NotificationsOverview, NumberView } from '@ab/shared';
import { createContext, useContext } from 'react';
import { t } from '@/lib/i18n';
import { NO_DRAFTS, type RuleDrafts } from './rule-drafts';

/** What every row of «الإشعارات» shares: may it edit, the numbers, whom a switch reaches, the drafts. */
export interface RulesApi {
  canManage: boolean;
  numbers: readonly NumberView[];
  reach: NotificationsOverview['reach'];
  /** The page's toast (one polite status). */
  onSaved: (message: string) => void;
  /** Every row's unsaved draft (survives the audience and «التواصل» tabs). */
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

/** A number's name for a row: null = «رقم القالب»; an id no longer listed reads «غير محدد». */
export function numberName(numbers: readonly NumberView[], id: string | null): string {
  if (id === null) return t.notificationRules.templateNumber;
  return numbers.find((n) => n.id === id)?.label ?? t.common.unset;
}
