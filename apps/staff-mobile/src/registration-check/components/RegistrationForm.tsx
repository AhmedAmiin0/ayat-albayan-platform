import { View } from 'react-native';
import { t, Button, Field, FilterPills, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import type { RegistrationCheckBy } from '@ab/shared';

interface RegistrationFormProps {
  by: RegistrationCheckBy;
  onBy: (by: RegistrationCheckBy) => void;
  text: string;
  onText: (text: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | undefined;
}

const MODES = (): { value: RegistrationCheckBy; label: string }[] => [
  { value: 'phone', label: t.registrationCheck.byPhone },
  { value: 'name', label: t.registrationCheck.byName },
];

/** The phone / name-or-code switch, that mode's one field, submit, and why it was not sent. */
export function RegistrationForm({
  by,
  onBy,
  text,
  onText,
  onSubmit,
  busy,
  error,
}: RegistrationFormProps) {
  const rc = t.registrationCheck;
  const phone = by === 'phone';
  return (
    <View style={{ gap: 12 }}>
      <FilterPills items={MODES()} value={by} onChange={onBy} accessibilityLabel={rc.title} role="radiogroup" />
      <Field
        key={by}
        label={phone ? rc.phone : rc.query}
        value={text}
        onChangeText={onText}
        ltr={phone}
        keyboardType={phone ? 'phone-pad' : 'default'}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        maxLength={phone ? 32 : 100}
      />
      {phone ? null : <Note>{rc.queryHint}</Note>}
      {error ? <ErrorLine message={error} /> : null}
      <Button label={busy ? rc.checking : rc.submit} busy={busy} onPress={onSubmit} />
    </View>
  );
}
