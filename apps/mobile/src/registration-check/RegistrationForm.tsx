import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { FilterPills } from '@/ui/FilterPills';
import type { CheckBy } from './registration-check';

export interface RegistrationFormProps {
  by: CheckBy;
  onBy: (by: CheckBy) => void;
  text: string;
  onText: (text: string) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string | undefined;
}

const MODES = (): { value: CheckBy; label: string }[] => [
  { value: 'phone', label: t.registrationCheck.byPhone },
  { value: 'name', label: t.registrationCheck.byName },
];

/** «برقم الهاتف» / «بالاسم أو الكود», the one field of that mode, «تحقق», and why it was not sent. */
export function RegistrationForm({ by, onBy, text, onText, onSubmit, busy, error }: RegistrationFormProps) {
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
