import { CHAT_LIST_NAME_MAX, chatListNameSchema } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { ErrorLine } from '../ErrorLine';

export interface ListNameFormProps {
  /** «إنشاء» or «حفظ». */
  submitLabel: string;
  onSubmit: (name: string) => void;
  /** The name being renamed; empty for a new list. */
  initial?: string;
  busy?: boolean;
  /** The server's answer, inline (the name is taken, the 30-list limit…). */
  error?: string | null;
}

/**
 * «اسم القائمة» and its button: 1–30 characters after trimming (the shared chatListNameSchema), the
 * button stays off until the name is valid, so only the server's refusals need a line.
 */
export function ListNameForm({ submitLabel, onSubmit, initial = '', busy = false, error }: ListNameFormProps) {
  const [value, setValue] = useState(initial);
  const name = chatListNameSchema.safeParse(value);
  const submit = () => {
    if (name.success && !busy) onSubmit(name.data);
  };
  return (
    <View style={{ gap: 12 }}>
      <Field
        label={t.inbox.lists.name}
        value={value}
        onChangeText={setValue}
        maxLength={CHAT_LIST_NAME_MAX}
        autoComplete="off"
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      {error ? <ErrorLine message={error} /> : null}
      <Button label={submitLabel} onPress={submit} busy={busy} disabled={!name.success} />
    </View>
  );
}
