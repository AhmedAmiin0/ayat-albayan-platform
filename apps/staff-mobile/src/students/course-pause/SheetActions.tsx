import { View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';

interface SheetActionsProps {
  label: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function SheetActions({
  label,
  busy,
  onConfirm,
  onCancel,
  danger = false,
}: SheetActionsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Button variant="secondary" label={t.common.back} onPress={onCancel} />
      </View>
      <View style={{ flex: 1 }}>
        <Button
          variant={danger ? 'danger' : 'primary'}
          label={busy ? t.common.saving : label}
          busy={busy}
          onPress={() => (busy ? undefined : onConfirm())}
        />
      </View>
    </View>
  );
}
