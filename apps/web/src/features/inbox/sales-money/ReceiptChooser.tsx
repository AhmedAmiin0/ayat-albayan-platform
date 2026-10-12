import { PAYMENT_ATTACHMENTS_MAX } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AttachmentItems } from '@/features/payments/AttachmentItems';
import { AttachmentPicker } from '@/features/payments/AttachmentPicker';
import { addAttachments, type AttachmentProblem } from '@/features/payments/attachments';
import { t } from '@/lib/i18n';
import { ChatReceiptGrid } from './ChatReceiptGrid';
import { addChatChoice, attachmentItem, type ReceiptChoice } from './receipt';

type Props = {
  sub: { id: string; student: { id: string } };
  value: ReceiptChoice[];
  onChange: (list: ReceiptChoice[]) => void;
  maxBytes: number;
};

/**
 * The transfer's «المرفقات» (R-ASST-04, optional, up to five): files the family sent in this chat (copied
 * into the package's receipts when picked) and photos / PDFs she uploads (checked here, uploaded on save).
 */
export function ReceiptChooser({ sub, value, onChange, maxBytes }: Props) {
  const [browsing, setBrowsing] = useState(false);
  const [problem, setProblem] = useState<AttachmentProblem | null>(null);
  const apply = (next: { list: ReceiptChoice[]; problem: AttachmentProblem | null }) => {
    setProblem(next.problem);
    onChange(next.list);
  };
  const full = value.length >= PAYMENT_ATTACHMENTS_MAX;

  return (
    <fieldset className="grid content-start gap-2">
      <legend className="mb-1 text-sm font-semibold text-ink">{t.salesMoney.attachments}</legend>
      <p className="text-xs text-ink-3">{t.salesMoney.attachmentsHint}</p>
      <AttachmentItems items={value.map(attachmentItem)} texts={t.salesMoney} onRemove={(i) => apply({ list: value.filter((_, j) => j !== i), problem: null })} />
      {full ? (
        <p className="text-xs text-ink-3">{t.salesMoney.attachmentsMax}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <AttachmentPicker
            label={t.salesMoney.attachmentsAdd}
            invalid={problem !== null}
            onPick={(files) => apply(addAttachments(value, files, { maxBytes, wrap: (file): ReceiptChoice => ({ kind: 'file', file }) }))}
          />
          <Button type="button" variant="secondary" size="sm" aria-expanded={browsing} onClick={() => setBrowsing((b) => !b)}>
            {t.salesMoney.receiptFromChat}
          </Button>
        </div>
      )}
      {browsing && !full && (
        <ChatReceiptGrid
          sub={sub}
          onPicked={(choice) => {
            setBrowsing(false);
            apply(addChatChoice(value, choice));
          }}
        />
      )}
      {problem && (
        <p role="alert" className="text-xs text-danger">
          {t.salesMoney.error[problem]}
        </p>
      )}
    </fieldset>
  );
}
