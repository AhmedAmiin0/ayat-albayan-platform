import { CHAT_LIST_NAME_MAX, chatListNameSchema } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, Field, ErrorLine } from '@ab/mobile-kit';

export interface ListNameFormProps {
  submitLabel: string;
  onSubmit: (name: string) => void;
  /** The name being renamed; empty for a new list. */
  initial?: string;
  busy?: boolean;
  /** The server's answer, inline (the name is taken, the 30-list limit…). */
  error?: string | null;
}

/** 1 to 30 characters after trimming (chatListNameSchema); only server refusals need a line. */
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
