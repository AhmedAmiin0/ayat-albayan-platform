import { View } from 'react-native';
import { t, FormLabel } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { AttachmentRow } from './AttachmentRow';
import { type Attachment, attachmentsFull, withAttachment, withoutAttachment } from './attachments';
import { PhotoButtons } from './PhotoButtons';

export interface AttachmentsFieldProps {
  value: readonly Attachment[];
  onChange: (value: Attachment[]) => void;
}

/** Bank transfers only, up to 5 photos, uploaded on save via POST /payments/receipt-upload-url. */
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
