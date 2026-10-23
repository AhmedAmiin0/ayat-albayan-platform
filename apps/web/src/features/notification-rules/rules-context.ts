import type { NotificationsOverview, NumberView } from '@ab/shared';
import { createContext, useContext } from 'react';
import { t } from '@/lib/i18n';

/** What every row of «الإشعارات» shares: may it edit, the numbers to pick from, whom a switch reaches. */
export interface RulesApi {
  canManage: boolean;
  numbers: readonly NumberView[];
  reach: NotificationsOverview['reach'];
  /** The page's toast (one polite status). */
  onSaved: (message: string) => void;
}

export const RulesContext = createContext<RulesApi>({ canManage: false, numbers: [], reach: undefined, onSaved: () => undefined });

export const useRules = (): RulesApi => useContext(RulesContext);

/** A number's name for a row: null = «رقم القالب»; an id no longer listed reads «غير محدد». */
export function numberName(numbers: readonly NumberView[], id: string | null): string {
  if (id === null) return t.notificationRules.templateNumber;
  return numbers.find((n) => n.id === id)?.label ?? t.common.unset;
}
