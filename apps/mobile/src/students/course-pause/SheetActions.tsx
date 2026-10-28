import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';

interface SheetActionsProps {
  /** The one primary, named by its verb («إيقاف الدورة», «حفظ»). */
  label: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** A sheet's foot: «إلغاء» (secondary) beside the one primary, equal widths at 44pt. */
export function SheetActions({ label, busy, onConfirm, onCancel }: SheetActionsProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <View style={{ flex: 1 }}>
        <Button variant="secondary" label={t.common.cancel} onPress={onCancel} />
      </View>
      <View style={{ flex: 1 }}>
        <Button label={busy ? t.common.saving : label} busy={busy} onPress={() => (busy ? undefined : onConfirm())} />
      </View>
    </View>
  );
}
