import { DESCRIPTION_MAX, type SettingKey } from '@ab/shared';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { useDescriptionEditor } from './use-description-editor';

export interface DescriptionEditorProps {
  valueKey: SettingKey;
  /** The text shown now; the box starts from it. */
  initial: string;
  /** An admin wrote this text (descriptionEdited): «أعد الوصف الأصلي» is offered. */
  edited: boolean;
  /** After a save or restore the server took, with the message to announce. */
  onDone: (message: string) => void;
  /** «إلغاء»: back to the value, nothing sent. */
  onCancel: () => void;
}

/**
 * «تعديل الوصف» inside the value sheet (docs/26b §2 phone, §4): a multiline box (16pt, ≥ 44pt),
 * a live «{n} / 500» counter, «إلغاء» then «احفظ» (primary), and «أعد الوصف الأصلي» for an edited text.
 * Errors stay inside the sheet.
 */
export function DescriptionEditor({ valueKey, initial, edited, onDone, onCancel }: DescriptionEditorProps) {
  const ed = useDescriptionEditor({ valueKey, initial, onDone });
  const d = t.mobileValues.description;
  return (
    <View style={{ gap: 12 }}>
      <Field
        label={d.label}
        value={ed.text}
        onChangeText={ed.setText}
        multiline
        textAlignVertical="top"
        editable={!ed.saving}
        maxLength={DESCRIPTION_MAX}
        accessibilityHint={ed.counter}
      />
      <Note>{ed.counter}</Note>
      {ed.error ? <ErrorLine message={ed.error} /> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button variant="ghost" label={d.cancel} disabled={ed.saving} onPress={onCancel} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label={d.save} busy={ed.saving} onPress={ed.submit} />
        </View>
      </View>
      {edited ? <Button variant="secondary" label={d.restore} disabled={ed.saving} onPress={ed.restore} /> : null}
    </View>
  );
}
