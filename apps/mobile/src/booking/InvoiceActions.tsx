import type { ReceiptSource } from '@/payments/receipt';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';

export interface InvoiceActionsProps {
  /** An invoice is already picked: the camera says «صوّر تاني», and «شيلها» shows. */
  picked: boolean;
  /** An upload is running: nothing else can start. */
  busy: boolean;
  onPick: (source: ReceiptSource) => void;
  /** Present only when a chat number is known: opens «من الشات». */
  onChat?: () => void;
  onRemove: () => void;
}

/** The invoice step's buttons: camera, gallery, «من الشات» (with a number), «شيلها» (once picked). */
export function InvoiceActions({ picked, busy, onPick, onChat, onRemove }: InvoiceActionsProps) {
  const button = (label: string, onPress: () => void, ghost = false) => (
    <Button variant={ghost ? 'ghost' : 'secondary'} label={label} disabled={busy} onPress={onPress} />
  );
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {button(picked ? t.payments.mobile.retake : t.booking.mobile.takePhoto, () => onPick('camera'))}
      {button(t.payments.mobile.pickPhoto, () => onPick('library'))}
      {onChat ? button(t.booking.invoice.fromChat, onChat) : null}
      {picked ? button(t.booking.invoice.remove, onRemove, true) : null}
    </View>
  );
}
