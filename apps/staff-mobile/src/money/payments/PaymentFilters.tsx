import { PAYMENT_KINDS, type PaymentKind } from '@ab/catalog';
import { useMemo } from 'react';
import { riyadhToday } from '@/calendar';
import { t, FilterPills, useNow } from '@ab/mobile-kit';
import { monthLabel, recentMonths } from '@/money/shared/months';

interface PaymentFiltersProps {
  kind: PaymentKind | 'all';
  month: string;
  onKind: (kind: PaymentKind | 'all') => void;
  onMonth: (month: string) => void;
}

/** Two chip rows: the type (payment / refund) and the month (this and the last five, or all). */
export function PaymentFilters({ kind, month, onKind, onMonth }: PaymentFiltersProps) {
  const now = useNow();
  const months = useMemo(
    () => [
      { value: 'all', label: t.mobileMoney.allMonths },
      // academy day (docs/34 b): the finance months are the academy's.
      ...recentMonths(riyadhToday(now)).map((m) => ({ value: m, label: monthLabel(m) })),
    ],
    [now],
  );
  const kinds = [
    { value: 'all' as const, label: t.mobileMoney.filterAll },
    ...PAYMENT_KINDS.map((k) => ({ value: k, label: t.enums.paymentKind[k] })),
  ];
  return (
    <>
      <FilterPills
        items={kinds}
        value={kind}
        onChange={onKind}
        accessibilityLabel={t.mobileMoney.kindFilter}
      />
      <FilterPills
        items={months}
        value={month}
        onChange={onMonth}
        accessibilityLabel={t.mobileMoney.monthFilter}
      />
    </>
  );
}
