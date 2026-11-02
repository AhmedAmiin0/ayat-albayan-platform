import type { SettingKey } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Field } from '@/core/ui/form/Field';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import type { ValueSheetState } from '@/ops/values/hooks/use-value-sheet';
import { impactOf } from '@/ops/values/lib/value-text';

/**
 * The question the sheet asks before acting: the same confirmations as the web (VALUE_CONFIRM: type
 * the number of days for a retention that will delete more, a plain «احفظ» for academy-wide
 * switches), each with what the change does; or «أغلق دون حفظ» when closing would drop an edit.
 */
export function SheetQuestion({ valueKey, sheet }: { valueKey: SettingKey; sheet: ValueSheetState }) {
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
  const impact = impactOf(valueKey);
  const typed = sheet.confirm === 'typed';
  return (
    <View style={{ gap: 12 }}>
      {impact ? <Note>{impact}</Note> : null}
      {/* The days are typed first, then confirmed: the box comes before its «احفظ». */}
      {typed ? (
        <Field label={v.typedLabel} value={sheet.typed} onChangeText={sheet.setTyped} keyboardType="number-pad" ltr />
      ) : null}
      <InlineConfirm
        message={typed ? v.typedConfirm.replace('{n}', sheet.draft.text) : v.plainConfirm}
        confirmLabel={t.common.save}
        onConfirm={sheet.confirmSave}
        onCancel={sheet.keepEditing}
        busy={sheet.saving}
      />
    </View>
  );
}
