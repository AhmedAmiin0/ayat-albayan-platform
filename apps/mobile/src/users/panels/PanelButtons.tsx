import { t } from '@/core/lib/i18n/i18n';
import { ButtonRow } from '@/core/ui/actions';
import { Button } from '@/core/ui/primitives/Button';

interface PanelButtonsProps {
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  disabled?: boolean;
}

/**
 * A form's foot (docs/07 §6 «الأزرار»): ONE ButtonRow, the verb (primary) at the reading start, then
 * «إلغاء» (secondary: it only closes the step); they stack when the labels do not fit.
 */
export function PanelButtons({ confirmLabel, onConfirm, onCancel, busy = false, disabled = false }: PanelButtonsProps) {
  return (
    <ButtonRow>
      <Button label={confirmLabel} onPress={onConfirm} busy={busy} disabled={disabled} />
      <Button variant="secondary" label={t.common.cancel} onPress={onCancel} />
    </ButtonRow>
  );
}
