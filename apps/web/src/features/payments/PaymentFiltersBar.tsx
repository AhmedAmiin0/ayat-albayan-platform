import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { usePhone } from '@/components/ui/use-narrow';
import type { PickedStudent } from '@/features/subscriptions/StudentPicker';
import { t } from '@/lib/i18n';
import { filterParams, type PaymentFilters } from './api';
import { PaymentFilterFields } from './PaymentFilterFields';

type Props = { value: PaymentFilters; onChange: (next: PaymentFilters) => void };

/**
 * The payments filters inline from 640px; on phones (owner, 2026-10-05: no form bars) a
 * «تصفية المدفوعات» button (with the active count) opens the same fields in a full-screen Dialog.
 */
export function PaymentFiltersBar({ value, onChange }: Props) {
  const phone = usePhone();
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<PickedStudent | null>(null);
  const fields = <PaymentFilterFields value={value} onChange={onChange} student={student} setStudent={setStudent} />;
  if (!phone) return fields;
  const active = Object.keys(filterParams(value)).length;
  return (
    <div className="mb-4">
      <Button variant="secondary" aria-haspopup="dialog" className="w-full" onClick={() => setOpen(true)}>
        <Icon name="sliders" />
        {t.payments.filters}
        {active > 0 && <span className="tabular-nums">({active})</span>}
      </Button>
      {open && (
        <Dialog
          title={t.payments.filters}
          onClose={() => setOpen(false)}
          actions={<Button onClick={() => setOpen(false)}>{t.payments.showResults}</Button>}
        >
          {fields}
        </Dialog>
      )}
    </div>
  );
}
