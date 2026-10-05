import { PAYMENT_KINDS, type PaymentKind } from '@ab/shared';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StudentPicker } from '@/features/subscriptions/StudentPicker';
import { t } from '@/lib/i18n';
import type { PaymentFilters } from './api';

export interface PaymentFilterFieldsProps {
  value: PaymentFilters;
  onChange: (patch: Partial<PaymentFilters>) => void;
  /** The filtered student's name (picked here, or from the page when opened from a link). */
  name: string;
  /** Remembers the picked name in PaymentFiltersBar, so it survives the phone sheet closing. */
  setPicked: (name: string | null) => void;
}

/** Student (search), date range and kind; the method filter sits with the table's column filters. */
export function PaymentFilterFields({ value, onChange, name, setPicked }: PaymentFilterFieldsProps) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] sm:items-end">
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
      <Field label={t.finance.from}>
        {(p) => <Input {...p} type="date" dir="ltr" value={value.from ?? ''} onChange={(e) => onChange({ from: e.target.value || undefined })} />}
      </Field>
      <Field label={t.finance.to}>
        {(p) => <Input {...p} type="date" dir="ltr" value={value.to ?? ''} onChange={(e) => onChange({ to: e.target.value || undefined })} />}
      </Field>
      <Field label={t.finance.kind}>
        {(p) => (
          <Select {...p} value={value.kind ?? ''} onChange={(e) => onChange({ kind: (e.target.value || undefined) as PaymentKind | undefined })}>
            <option value="">{t.finance.all}</option>
            {PAYMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {t.enums.paymentKind[k]}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}
