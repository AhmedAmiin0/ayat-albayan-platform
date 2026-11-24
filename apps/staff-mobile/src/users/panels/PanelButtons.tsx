import { t, Button } from '@ab/mobile-kit';
import { ButtonRow } from '@/core/ui/actions';

interface PanelButtonsProps {
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  disabled?: boolean;
}

/** One ButtonRow (docs/07 §6), the verb first; cancel only closes the step. */
export function PanelButtons({ confirmLabel, onConfirm, onCancel, busy = false, disabled = false }: PanelButtonsProps) {
  return (
    <ButtonRow>
      <Button label={confirmLabel} onPress={onConfirm} busy={busy} disabled={disabled} />
      <Button variant="secondary" label={t.common.cancel} onPress={onCancel} />
    </ButtonRow>
  );
}
