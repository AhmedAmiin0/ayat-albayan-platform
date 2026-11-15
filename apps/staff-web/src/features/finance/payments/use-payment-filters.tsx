import { useState } from 'react';
import { chipIfSet } from '@/components/table-toolbar/fields';
import type { ExtraFilters } from '@/components/table-toolbar/types';
import { t } from '@/lib/i18n/i18n';
import type { PaymentFilters } from './api';
import { PaymentFilterFields } from './PaymentFilterFields';
import type { PaymentsUrlSearch } from './search';

export interface PaymentFiltersOptions {
  value: PaymentFilters;
  /** The filtered student's name from the list, when the page was opened from a link. */
  studentName?: string | undefined;
  /** A URL patch; the page sends it back to page 1. */
  onChange: (patch: Partial<PaymentsUrlSearch>) => void;
}

/** Student, date range and kind (all in the URL) as the table toolbar's extra filters, with their chips. */
export function usePaymentFilters({ value, studentName, onChange }: PaymentFiltersOptions): ExtraFilters {
  const [picked, setPicked] = useState<string | null>(null);
  const name = picked ?? studentName ?? '';
  const chips = [
    ...chipIfSet({ id: 'student', label: t.subscriptions.student, value: value.studentId, text: name || '…', onRemove: () => (setPicked(null), onChange({ studentId: undefined })) }),
    ...chipIfSet({ id: 'from', label: t.finance.from, value: value.from, onRemove: () => onChange({ from: undefined }) }),
    ...chipIfSet({ id: 'to', label: t.finance.to, value: value.to, onRemove: () => onChange({ to: undefined }) }),
    ...chipIfSet({
      id: 'kind',
      label: t.finance.kind,
      value: value.kind,
      text: value.kind && t.enums.paymentKind[value.kind],
      onRemove: () => onChange({ kind: undefined }),
    }),
  ];
  return {
    fields: <PaymentFilterFields value={value} onChange={onChange} name={name} setPicked={setPicked} />,
    chips,
    onClearAll: () => {
      setPicked(null);
      onChange({ studentId: undefined, from: undefined, to: undefined, kind: undefined, f_method: undefined });
    },
  };
}
