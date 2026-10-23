import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Field } from '@/ui/Field';
import { InlineConfirm } from '@/ui/InlineConfirm';
import type { ValueSheetState } from './use-value-sheet';

/**
 * The question the sheet asks before acting: the same confirmations as the web (VALUE_CONFIRM: type
 * the number of days for a value that deletes data, a plain «احفظ» for academy-wide switches), or
 * «أغلق دون حفظ» when closing would drop an edit.
 */
export function SheetQuestion({ sheet }: { sheet: ValueSheetState }) {
  const v = t.mobileValues;
  if (sheet.stage === 'closing') {
    return (
      <InlineConfirm
        message={v.unsavedClose}
        confirmLabel={v.closeAnyway}
        cancelLabel={v.keepEditing}
        onConfirm={sheet.close}
        onCancel={sheet.keepEditing}
      />
    );
  }
  if (sheet.stage !== 'confirm') return null;
  if (sheet.confirm === 'typed') {
    return (
      <View style={{ gap: 12 }}>
        <InlineConfirm
          message={v.typedConfirm.replace('{n}', sheet.draft.text)}
          confirmLabel={t.common.save}
          onConfirm={sheet.confirmSave}
          onCancel={sheet.keepEditing}
          busy={sheet.saving}
        />
        <Field label={v.typedLabel} value={sheet.typed} onChangeText={sheet.setTyped} keyboardType="number-pad" ltr />
      </View>
    );
  }
  return (
    <InlineConfirm
      message={v.plainConfirm}
      confirmLabel={t.common.save}
      onConfirm={sheet.confirmSave}
      onCancel={sheet.keepEditing}
      busy={sheet.saving}
    />
  );
}
