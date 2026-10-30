import type { SalesChatReceipt } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { AttachmentRow } from '@/payments/receipts/AttachmentRow';
import { attachmentsFull, withAttachment, withoutAttachment } from '@/payments/receipts/attachments';
import { FormLabel } from '@/payments/FormLabel';
import { PhotoButtons } from '@/payments/receipts/PhotoButtons';
import { Button } from '@/core/ui/primitives/Button';
import { ChatReceiptList } from '@/sales-subscribe/receipts/ChatReceiptList';
import { useCopyChatReceipt } from '@/sales-subscribe/receipts/chat-receipts';
import { salesErrorText } from '@/sales-subscribe/lib/sales-errors';
import type { ReceiptChoice } from '@/sales-subscribe/lib/transfer-form';

interface SalesReceiptFieldProps {
  /** The package's student (whose family chat is listed) and the package (where the copy goes). */
  target: { studentId: string; subscriptionId: string; bind?: { phone?: string } };
  value: readonly ReceiptChoice[];
  onChange: (value: ReceiptChoice[]) => void;
}

/**
 * «المرفقات», optional, up to 5 (R-ASST-04, owner 2026-10-12): files the family sent in the chat
 * (each copied under the package at once) and photos from the camera / gallery like the admin's
 * payment form (uploaded on save). Each one is added to the list and can be removed.
 */
export function SalesReceiptField({ target, value, onChange }: SalesReceiptFieldProps) {
  const [browsing, setBrowsing] = useState(false);
  const copy = useCopyChatReceipt();
  const m = t.salesMoney;
  const add = (item: ReceiptChoice) => onChange(withAttachment(value, item));

  const fromChat = (item: SalesChatReceipt) => {
    // Already in the list: another copy would only be a second object of the same file.
    if (value.some((a) => a.kind === 'chat' && a.messageId === item.message_id)) return setBrowsing(false);
    copy.mutate(
      { subscriptionId: target.subscriptionId, messageId: item.message_id, ...target.bind },
      {
        onSuccess: (r) => {
          setBrowsing(false);
          add({ kind: 'chat', messageId: item.message_id, path: r.receipt_path });
        },
      },
    );
  };

  return (
    <View style={{ gap: 8 }}>
      <FormLabel>{m.attachments}</FormLabel>
      <Note>{m.attachmentsHint}</Note>
      {value.map((item, i) => (
        <AttachmentRow
          key={item.kind === 'chat' ? item.path : item.receipt.uri}
          item={item}
          n={i + 1}
          text={m}
          onRemove={() => onChange(withoutAttachment(value, i))}
        />
      ))}
      {attachmentsFull(value) ? (
        <Note>{m.attachmentsMax}</Note>
      ) : (
        <>
          <Button variant="secondary" label={m.receiptFromChat} onPress={() => setBrowsing((b) => !b)} />
          {browsing ? (
            <ChatReceiptList
              studentId={target.studentId}
              {...(target.bind ? { bind: target.bind } : {})}
              busyId={copy.isPending ? copy.variables.messageId : undefined}
              onPick={fromChat}
            />
          ) : null}
          <Note>{m.receiptUpload}</Note>
          <PhotoButtons
            camera={m.receiptCamera}
            library={m.receiptLibrary}
            tooLarge={m.error.receipt_too_large}
            onPicked={(receipt) => add({ kind: 'file', receipt })}
          />
        </>
      )}
      {copy.isError ? <ErrorLine message={salesErrorText(copy.error)} /> : null}
    </View>
  );
}
