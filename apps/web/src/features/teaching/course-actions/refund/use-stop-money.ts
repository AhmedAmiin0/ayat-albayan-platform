import {
  offeredRefund,
  STOP_MONEY_START,
  stopMoney,
  type StopMoney,
  type StopMoneyState,
} from '@ab/client-core';
import type { CourseStopPreview, StopRefund } from '@ab/shared';
import { useState } from 'react';
import { usePermissions } from '@/features/people/auth';

/** The sheet's money part: the choice, what it asks and its summary. */
export interface StopMoneyView {
  state: StopMoneyState;
  set: (patch: Partial<StopMoneyState>) => void;
  /** «إلغاء مع استرداد»'s lines; null = not offered (no key, nothing paid, or unreadable). */
  breakdown: StopRefund | null;
  money: StopMoney | null;
}

/**
 * The stop sheet's money choice (owner 2026-11-06): «إلغاء فقط» with what the family still owes,
 * or «إلغاء مع استرداد» with the refund amount (the same rules as mobile, @ab/client-core).
 */
export function useStopMoney(preview: CourseStopPreview | undefined): StopMoneyView {
  const [state, setState] = useState<StopMoneyState>(STOP_MONEY_START);
  const { can } = usePermissions();
  const breakdown = offeredRefund(can('subscriptions.refund'), preview?.refund);
  const money = preview ? stopMoney({ state, preview, breakdown }) : null;
  const set = (patch: Partial<StopMoneyState>) => setState((s) => ({ ...s, ...patch }));
  return { state, set, breakdown, money };
}
