import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ReceiptField } from '@/features/payments/ReceiptField';
import { t } from '@/lib/i18n';
import { ChatReceiptGrid } from './ChatReceiptGrid';
import type { ReceiptChoice } from './receipt';

type Props = {
  sub: { id: string; student: { id: string } };
  value: ReceiptChoice | null;
  onChange: (choice: ReceiptChoice | null) => void;
  error?: string | null;
};

/**
 * The transfer's required receipt (R-ASST-04): a file the family sent in this chat, or a photo / PDF she
 * uploads (the admin's ReceiptField, checked by receiptProblem on save). Once chosen, «غيّر الإيصال».
 */
export function ReceiptChooser({ sub, value, onChange, error }: Props) {
  const [browsing, setBrowsing] = useState(false);
  if (value?.kind === 'chat') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-ink">{t.salesMoney.receiptChosen}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          {t.salesMoney.receiptChange}
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-3">
      <ReceiptField file={value?.file ?? null} onChange={(file) => onChange(file ? { kind: 'file', file } : null)} error={error} />
      {!value && (
        <>
          <Button type="button" variant="secondary" size="sm" className="justify-self-start" aria-expanded={browsing} onClick={() => setBrowsing((b) => !b)}>
            {t.salesMoney.receiptFromChat}
          </Button>
          {browsing && (
            <ChatReceiptGrid
              sub={sub}
              onPicked={(choice) => {
                setBrowsing(false);
                onChange(choice);
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
