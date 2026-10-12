import { PAYMENT_ATTACHMENTS_MAX } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { AttachmentItems } from './AttachmentItems';
import { AttachmentPicker } from './AttachmentPicker';
import { addAttachments, type AttachmentProblem } from './attachments';

type Props = { files: File[]; onChange: (files: File[]) => void; maxBytes: number };

/** «المرفقات» of a bank payment (admin): up to five images / PDFs, optional, uploaded on save. */
export function AttachmentsField({ files, onChange, maxBytes }: Props) {
  const [problem, setProblem] = useState<AttachmentProblem | null>(null);
  const add = (picked: File[]) => {
    const next = addAttachments(files, picked, { maxBytes, wrap: (f) => f });
    setProblem(next.problem);
    onChange(next.list);
  };
  const remove = (index: number) => {
    setProblem(null);
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <fieldset className="grid content-start gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold text-ink">{t.payments.attachments}</legend>
      <p className="text-xs text-ink-3">{t.payments.attachmentsHint}</p>
      <AttachmentItems items={files.map((f, i) => ({ key: `${i}-${f.name}`, name: f.name }))} texts={t.payments} onRemove={remove} />
      {files.length < PAYMENT_ATTACHMENTS_MAX ? (
        <AttachmentPicker label={t.payments.attachmentsAdd} onPick={add} invalid={problem !== null} />
      ) : (
        <p className="text-xs text-ink-3">{t.payments.error.too_many_attachments}</p>
      )}
      {problem && (
        <p role="alert" className="text-xs text-danger">
          {t.payments.error[problem]}
        </p>
      )}
    </fieldset>
  );
}
