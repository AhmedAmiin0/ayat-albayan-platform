import { PAYMENT_KINDS, PAYMENT_METHODS, type PaymentKind, type PaymentMethod } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StudentPicker, type PickedStudent } from '@/features/subscriptions/StudentPicker';
import { t } from '@/lib/i18n';
import type { PaymentFilters } from './api';

type Props = { value: PaymentFilters; onChange: (next: PaymentFilters) => void };

/** Student (search), date range, method and kind; each change goes back to page 1. */
export function PaymentFiltersBar({ value, onChange }: Props) {
  const [student, setStudent] = useState<PickedStudent | null>(null);
  const set = (patch: Partial<PaymentFilters>) => onChange({ ...value, ...patch });
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] sm:items-end">
      {student ? (
        <p className="flex min-h-11 items-center gap-2 text-sm">
          <span className="font-semibold text-ink">{student.name}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => (setStudent(null), set({ studentId: undefined }))}>
            {t.finance.allStudents}
          </Button>
        </p>
      ) : (
        <StudentPicker onPick={(s) => (setStudent(s), set({ studentId: s.id }))} />
      )}
      <Field label={t.finance.from}>
        {(p) => <Input {...p} type="date" dir="ltr" value={value.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} />}
      </Field>
      <Field label={t.finance.to}>
        {(p) => <Input {...p} type="date" dir="ltr" value={value.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} />}
      </Field>
      <Field label={t.payments.method}>
        {(p) => (
          <Select {...p} value={value.method ?? ''} onChange={(e) => set({ method: (e.target.value || undefined) as PaymentMethod | undefined })}>
            <option value="">{t.finance.all}</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t.enums.paymentMethod[m]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.finance.kind}>
        {(p) => (
          <Select {...p} value={value.kind ?? ''} onChange={(e) => set({ kind: (e.target.value || undefined) as PaymentKind | undefined })}>
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
