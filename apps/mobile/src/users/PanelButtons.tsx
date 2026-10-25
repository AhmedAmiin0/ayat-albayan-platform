import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/core/ui/primitives/Button';

export interface PanelButtonsProps {
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  disabled?: boolean;
}

/** A form's foot: [«إلغاء» ghost][the verb, primary], 44pt, side by side. */
export function PanelButtons({ confirmLabel, onConfirm, onCancel, busy = false, disabled = false }: PanelButtonsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Button variant="ghost" label={t.common.cancel} onPress={onCancel} />
      </View>
      <View style={{ flex: 1 }}>
        <Button label={confirmLabel} onPress={onConfirm} busy={busy} disabled={disabled} />
      </View>
    </View>
  );
}
