import { View } from 'react-native';
import { t, Field } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';

interface MoveReasonProps {
  value: string;
  onChange: (text: string) => void;
}

/**
 * «سبب تغيير الموعد (اختياري)» (docs/47 owner call 4) of a one-lesson move, with the hint that the
 * teacher sees it in the student file. Up to 500 characters, as the API allows.
 */
export function MoveReason({ value, onChange }: MoveReasonProps) {
  return (
    <View style={{ gap: 4 }}>
      <Field
        label={t.reschedule.reason}
        value={value}
        onChangeText={onChange}
        maxLength={500}
        multiline
      />
      <Note>{t.reschedule.reasonHint}</Note>
    </View>
  );
}
