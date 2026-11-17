import { View } from 'react-native';
import { t, Button } from '@ab/mobile-kit';

interface SheetActionsProps {
  /** The one primary, named by its verb («إيقاف الدورة», «حفظ»). */
  label: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** «تأكيد الإلغاء» (owner 2026-11-17): the primary in the danger look. */
  danger?: boolean;
}

/** A sheet's foot: «رجوع» (secondary) beside the one primary, equal widths at 44pt. */
export function SheetActions({ label, busy, onConfirm, onCancel, danger = false }: SheetActionsProps) {
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
