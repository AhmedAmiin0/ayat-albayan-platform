import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { AttachmentRow } from './AttachmentRow';
import { type Attachment, attachmentsFull, withAttachment, withoutAttachment } from './attachments';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { PhotoButtons } from './PhotoButtons';

export interface AttachmentsFieldProps {
  value: readonly Attachment[];
  onChange: (value: Attachment[]) => void;
}

/**
 * «المرفقات» of the admin's payment (owner 2026-10-12): shown for a bank transfer only, optional, up
 * to 5 photos from the camera or the gallery, each removable; uploaded on save through
 * POST /payments/receipt-upload-url (use-record-payment).
 */
export function AttachmentsField({ value, onChange }: AttachmentsFieldProps) {
  const p = t.payments;
  return (
    <View style={{ gap: 8 }}>
      <FormLabel>{p.attachments}</FormLabel>
      <Note>{p.attachmentsHint}</Note>
      {value.map((item, i) => (
        <AttachmentRow
          key={item.kind === 'chat' ? item.path : item.receipt.uri}
          item={item}
          n={i + 1}
          text={p}
          onRemove={() => onChange(withoutAttachment(value, i))}
        />
      ))}
      {attachmentsFull(value) ? (
        <Note>{t.salesMoney.attachmentsMax}</Note>
      ) : (
        <PhotoButtons
          camera={p.mobile.takePhoto}
          library={p.mobile.pickPhoto}
          tooLarge={p.error.receipt_too_large}
          onPicked={(receipt) => onChange(withAttachment(value, { kind: 'file', receipt }))}
        />
      )}
    </View>
  );
}
