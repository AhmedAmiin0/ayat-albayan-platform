import { Field, t } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { View } from 'react-native';

interface TrialLinkFieldProps {
  value: string;
  onChange: (link: string) => void;
}

/** Optional, the teacher's link when empty; must be https (400 meeting_link_invalid). */
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
