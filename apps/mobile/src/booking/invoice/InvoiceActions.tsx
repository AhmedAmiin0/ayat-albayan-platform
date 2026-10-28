import type { ReceiptSource } from '@/payments/receipt';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';

interface InvoiceActionsProps {
  /** An invoice is already picked: the camera says «صوّر تاني», and «شيلها» shows. */
  picked: boolean;
  /** An upload is running: nothing else can start. */
  busy: boolean;
  onPick: (source: ReceiptSource) => void;
  /** Present only when a chat number is known: opens «من الشات». */
  onChat?: () => void;
  onRemove: () => void;
}

/**
 * The invoice step's buttons (docs/07 §6 «الأزرار»): ONE ButtonRow camera | gallery | «من الشات» (with
 * a number), then «شيلها» (danger, once picked) full width under it.
 */
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
