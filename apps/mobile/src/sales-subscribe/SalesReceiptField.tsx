import type { SalesChatReceipt } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { useUploadMaxBytes } from '@/lib/public-config';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { pickReceipt, type ReceiptSource } from '@/payments/receipt';
import { Button } from '@/ui/Button';
import { ChatReceiptList } from './ChatReceiptList';
import { ChosenReceipt } from './ChosenReceipt';
import { useCopyChatReceipt } from './chat-receipts';
import { salesErrorText } from './sales-errors';
import type { ReceiptChoice } from './transfer-form';

export interface SalesReceiptFieldProps {
  /** The package's student (whose family chat is listed) and the package (where the copy goes). */
  target: { studentId: string; subscriptionId: string };
  value: ReceiptChoice | null;
  onChange: (value: ReceiptChoice | null) => void;
  error?: string | undefined;
}

/**
 * «الإيصال», required (R-ASST-04): one the family sent in the chat (copied under the package at once)
 * or a photo from the camera / gallery like the admin's payment form (uploaded on save).
 */
export function SalesReceiptField({ target, value, onChange, error }: SalesReceiptFieldProps) {
  const [browsing, setBrowsing] = useState(false);
  const [pickError, setPickError] = useState<string>();
  const copy = useCopyChatReceipt();
  const maxBytes = useUploadMaxBytes();
  const m = t.salesMoney;

  const fromChat = (item: SalesChatReceipt) =>
    copy.mutate(
      { subscriptionId: target.subscriptionId, messageId: item.message_id },
      {
        onSuccess: (r) => {
          setBrowsing(false);
          onChange({ kind: 'chat', messageId: item.message_id, path: r.receipt_path });
        },
      },
    );

  async function fromFile(source: ReceiptSource) {
    setPickError(undefined);
    try {
      const picked = await pickReceipt(source);
      if (!picked) return;
      if (picked.size > maxBytes) setPickError(m.error.receipt_too_large);
      else onChange({ kind: 'file', receipt: picked });
    } catch {
      setPickError(t.common.error);
    }
  }

  const failure = copy.isError ? salesErrorText(copy.error) : (pickError ?? error);
  return (
    <View style={{ gap: 8 }}>
      <FormLabel required>{m.receipt}</FormLabel>
      {value ? (
        <ChosenReceipt value={value} onClear={() => onChange(null)} />
      ) : (
        <>
          <Button variant="secondary" label={m.receiptFromChat} onPress={() => setBrowsing((b) => !b)} />
          {browsing ? (
            <ChatReceiptList
              studentId={target.studentId}
              busyId={copy.isPending ? copy.variables.messageId : undefined}
              onPick={fromChat}
            />
          ) : null}
          <Note>{m.receiptUpload}</Note>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" label={m.receiptCamera} onPress={() => void fromFile('camera')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" label={m.receiptLibrary} onPress={() => void fromFile('library')} />
            </View>
          </View>
        </>
      )}
      {failure ? <ErrorLine message={failure} /> : null}
    </View>
  );
}
