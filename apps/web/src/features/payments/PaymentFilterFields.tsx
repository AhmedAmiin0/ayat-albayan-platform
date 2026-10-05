import { PAYMENT_KINDS, type PaymentKind } from '@ab/shared';
import { DateFilterField, SelectFilterField } from '@/components/table-toolbar/fields';
import { Button } from '@/components/ui/button';
import { StudentPicker } from '@/features/subscriptions/StudentPicker';
import { t } from '@/lib/i18n';
import type { PaymentFilters } from './api';

export interface PaymentFilterFieldsProps {
  value: PaymentFilters;
  onChange: (patch: Partial<PaymentFilters>) => void;
  /** The filtered student's name (picked here, or from the page when opened from a link). */
  name: string;
  /** Remembers the picked name on the page, so it survives the panel closing. */
  setPicked: (name: string | null) => void;
}

const kindOptions = [{ value: '', label: t.finance.all }, ...PAYMENT_KINDS.map((k) => ({ value: k, label: t.enums.paymentKind[k] }))];

/** The «تصفية» panel's own fields of /admin/payments: student (search), date range and kind. */
export function PaymentFilterFields({ value, onChange, name, setPicked }: PaymentFilterFieldsProps) {
  return (
    <>
      {value.studentId ? (
        <p className="flex min-h-11 items-center gap-2 text-sm">
          <span className="font-semibold text-ink">{name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => (setPicked(null), onChange({ studentId: undefined }))}>
            {t.finance.allStudents}
          </Button>
        </p>
      ) : (
        <StudentPicker onPick={(s) => (setPicked(s.name), onChange({ studentId: s.id }))} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <DateFilterField label={t.finance.from} value={value.from} onChange={(from) => onChange({ from })} />
        <DateFilterField label={t.finance.to} value={value.to} onChange={(to) => onChange({ to })} />
      </div>
      <SelectFilterField
        label={t.finance.kind}
        value={value.kind}
        options={kindOptions}
        onChange={(v) => onChange({ kind: (v || undefined) as PaymentKind | undefined })}
      />
    </>
  );
}
