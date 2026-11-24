import {
  mayLowerOwe,
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
  /** Null when not offered (no key, nothing paid, or unreadable). */
  breakdown: StopRefund | null;
  money: StopMoney | null;
  /** Zero or custom amounts need subscriptions.refund on this student (mayLowerOwe). */
  mayLower: boolean;
}

/** Uses the same rules as mobile (@ab/client-core). */
export function useStopMoney(preview: CourseStopPreview | undefined): StopMoneyView {
  const [state, setState] = useState<StopMoneyState>(STOP_MONEY_START);
  const { can } = usePermissions();
  const holds = can('subscriptions.refund');
  const breakdown = offeredRefund(holds, preview?.refund);
  const mayLower = mayLowerOwe(holds, preview);
  const money = preview ? stopMoney({ state, preview, breakdown }) : null;
  const set = (patch: Partial<StopMoneyState>) => setState((s) => ({ ...s, ...patch }));
  return { state, set, breakdown, money, mayLower };
}
