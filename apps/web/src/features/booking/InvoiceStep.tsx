import { t } from '@/lib/i18n';
import type { BookingDraft } from './draft';
import { InvoiceField } from './InvoiceField';

export interface InvoiceStepProps {
  draft: Pick<BookingDraft, 'invoice' | 'requestId'>;
  /** The family's WhatsApp number (E.164): the student's guardian, or the lead's number. */
  chatPhone: string | null;
  onChange: (patch: Pick<BookingDraft, 'invoice'>) => void;
}

/** The invoice step (R-PAY-03): required for a subscription and a makeup, never for a trial. */
export function InvoiceStep({ draft, chatPhone, onChange }: InvoiceStepProps) {
  return (
    <div className="grid gap-3 sm:max-w-[520px]">
      <InvoiceField
        value={draft.invoice}
        requestId={draft.requestId}
        chatPhone={chatPhone}
        onChange={(invoice) => onChange({ invoice })}
      />
      {!draft.invoice && <p className="text-xs text-ink-3">{t.lessons.error.invoice_required}</p>}
    </div>
  );
}
