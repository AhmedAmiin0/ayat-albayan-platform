import type { StatusStyle } from '@ab/shared';
import { t } from '@/lib/i18n';
import { FilterPills } from '@/ui/FilterPills';

export interface StatusPillsProps<S extends string> {
  statuses: readonly S[];
  labels: Readonly<Record<S, string>>;
  styles: Readonly<Record<S, StatusStyle>>;
  value: '' | S;
  onChange: (status: '' | S) => void;
}

/** «كل الحالات» then each status with its shape (web FilterBar's status select). */
export function StatusPills<S extends string>({ statuses, labels, styles, value, onChange }: StatusPillsProps<S>) {
  const items = [
    { value: '' as const, label: t.assistants.ledger.allStatuses },
    ...statuses.map((s) => ({ value: s, label: labels[s], ...styles[s] })),
  ];
  return <FilterPills<'' | S> items={items} value={value} onChange={onChange} accessibilityLabel={t.assistants.ledger.statusLabel} />;
}
