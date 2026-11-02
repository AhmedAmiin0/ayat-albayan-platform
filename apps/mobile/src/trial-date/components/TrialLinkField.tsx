import { Field } from '@/core/ui/form/Field';
import { Note } from '@/core/ui/feedback/Note';
import { t } from '@/core/lib/i18n/i18n';
import { View } from 'react-native';

interface TrialLinkFieldProps {
  value: string;
  onChange: (link: string) => void;
}

/**
 * «رابط الحلقة» on the review of «موعد تجريبي جديد» (owner 2026-11-02): optional, the teacher's
 * link when empty; the assistant's must be https (400 meeting_link_invalid otherwise).
 */
export function TrialLinkField({ value, onChange }: TrialLinkFieldProps) {
  return (
    <View style={{ gap: 6 }}>
      <Field
        label={t.booking.meetingLink}
        ltr
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        inputMode="url"
      />
      <Note>{t.trialDate.meetingLinkHint}</Note>
    </View>
  );
}
