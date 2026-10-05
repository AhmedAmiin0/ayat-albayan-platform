import { PAYMENT_KINDS, type PaymentKind } from '@ab/shared';
import { useMemo } from 'react';
import { t } from '@/lib/i18n';
import { FilterPills } from '@/ui/FilterPills';
import { monthLabel, recentMonths, riyadhToday } from './months';

export interface PaymentFiltersProps {
  kind: PaymentKind | 'all';
  month: string;
  onKind: (kind: PaymentKind | 'all') => void;
  onMonth: (month: string) => void;
}

/** Two chip rows: the type (payment / refund) and the month (this and the last five, or all). */
export function PaymentFilters({ kind, month, onKind, onMonth }: PaymentFiltersProps) {
  const months = useMemo(
    () => [
      { value: 'all', label: t.mobileMoney.allMonths },
      ...recentMonths(riyadhToday()).map((m) => ({ value: m, label: monthLabel(m) })),
    ],
    [],
  );
  const kinds = [
    { value: 'all' as const, label: t.mobileMoney.filterAll },
    ...PAYMENT_KINDS.map((k) => ({ value: k, label: t.enums.paymentKind[k] })),
  ];
  return (
    <>
      <FilterPills items={kinds} value={kind} onChange={onKind} accessibilityLabel={t.mobileMoney.kindFilter} />
      <FilterPills items={months} value={month} onChange={onMonth} accessibilityLabel={t.mobileMoney.monthFilter} />
    </>
  );
}
