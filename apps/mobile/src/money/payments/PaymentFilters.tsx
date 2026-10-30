import { PAYMENT_KINDS, type PaymentKind } from '@ab/shared';
import { useMemo } from 'react';
import { riyadhToday } from '@/calendar/lib/week';
import { t } from '@/core/lib/i18n/i18n';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { monthLabel, recentMonths } from '../shared/months';

interface PaymentFiltersProps {
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
      // academy day (docs/34 b): the finance months are the academy's.
      ...recentMonths(riyadhToday(new Date())).map((m) => ({ value: m, label: monthLabel(m) })),
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
