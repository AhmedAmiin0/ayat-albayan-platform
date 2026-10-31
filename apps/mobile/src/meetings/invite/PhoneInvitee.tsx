import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { fromPhone, type DraftInvitee } from './invitee-draft';

const L = t.meetingInvites;

/** «رقم هاتف»: a typed number, checked by the shared normalizePhone (E.164 with its country code). */
export function PhoneInvitee({ onAdd, disabled }: { onAdd: (d: DraftInvitee) => void; disabled: boolean }) {
  const [text, setText] = useState('');
  const [bad, setBad] = useState(false);
  const add = () => {
    const draft = fromPhone(text);
    setBad(draft === null);
    if (!draft) return;
    onAdd(draft);
    setText('');
  };
  return (
    <View style={{ gap: 8 }}>
      <Field
        label={L.tabs.phone}
        ltr
        value={text}
        keyboardType="phone-pad"
        placeholder={L.phonePlaceholder}
        maxLength={32}
        onChangeText={(v) => {
          setText(v);
          setBad(false);
        }}
      />
      <Button variant="secondary" label={L.addPhone} disabled={disabled || !text.trim()} onPress={add} />
      {bad ? <ErrorLine message={L.invalidPhone} /> : null}
    </View>
  );
}
