import { View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { Note } from '../feedback/Note';
import { Field } from '../form/Field';

interface MoveReasonProps {
  value: string;
  onChange: (text: string) => void;
  /** Default: staff's «سبب تغيير الموعد (اختياري)»; the family's «ملاحظة للأكاديمية (اختياري)». */
  label?: string;
  /** Default: the teacher sees it in the student file; null = no hint. */
  hint?: string | null;
  /** An example of what to write («مثلًا: …»). */
  placeholder?: string;
}

/**
 * The optional words of a one-lesson move (docs/47 owner call 4): staff's move reason, or the
 * family's note with «اطلب موعدًا آخر». Up to 500 characters, as the API allows.
 */
export function MoveReason({ value, onChange, label, hint, placeholder }: MoveReasonProps) {
  const said = hint === undefined ? t.reschedule.reasonHint : hint;
  return (
    <View style={{ gap: 4 }}>
      <Field
        label={label ?? t.reschedule.reason}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        maxLength={500}
        multiline
      />
      {said ? <Note>{said}</Note> : null}
    </View>
  );
}
