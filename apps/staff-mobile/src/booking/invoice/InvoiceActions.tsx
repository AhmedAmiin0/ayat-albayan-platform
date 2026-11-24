import type { ReceiptSource } from '@/core/lib/receipts/receipt';
import { View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';

interface InvoiceActionsProps {
  picked: boolean;
  /** An upload is running: nothing else can start. */
  busy: boolean;
  onPick: (source: ReceiptSource) => void;
  /** Present only when a chat number is known. */
  onChat?: () => void;
  onRemove: () => void;
}

/** docs/07 §6: one ButtonRow, then remove (danger) full width once picked. */
export function InvoiceActions({ picked, busy, onPick, onChat, onRemove }: InvoiceActionsProps) {
  const button = (label: string, onPress: () => void) => (
    <Button variant="secondary" label={label} disabled={busy} onPress={onPress} />
  );
  return (
    <View style={{ gap: 8 }}>
      <ButtonRow>
        {button(picked ? t.payments.mobile.retake : t.booking.mobile.takePhoto, () => onPick('camera'))}
        {button(t.payments.mobile.pickPhoto, () => onPick('library'))}
        {onChat ? button(t.booking.invoice.fromChat, onChat) : null}
      </ButtonRow>
      {picked ? <Button variant="danger" label={t.booking.invoice.remove} disabled={busy} onPress={onRemove} /> : null}
    </View>
  );
}
