import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { usePhone } from '@/components/ui/use-narrow';
import { t } from '@/lib/i18n';
import { filterParams, type PaymentFilters } from './api';
import { PaymentFilterFields } from './PaymentFilterFields';

type Props = {
  value: PaymentFilters;
  /** The filtered student's name when the page was opened from a link (the picker was not used). */
  studentName?: string | undefined;
  onChange: (patch: Partial<PaymentFilters>) => void;
};

/**
 * Student, date range and kind (every value in the URL, so a reload or a shared link keeps them),
 * inline from 640px; on phones (owner, 2026-10-05: no form bars) a «تصفية المدفوعات» button with
 * the active count opens the same fields in a full-screen Dialog.
 */
export function PaymentFiltersBar({ value, studentName, onChange }: Props) {
  const phone = usePhone();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const name = picked ?? studentName ?? '';
  const fields = <PaymentFilterFields value={value} onChange={onChange} name={name} setPicked={setPicked} />;
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
