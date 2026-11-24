import { useState } from 'react';
import { AuthAlert, t, Button, Field } from '@ab/mobile-kit';
import { useAccountSetup } from './use-account-setup';

const S = t.teacherAuth.setup;

export function SetupFields() {
  const setup = useAccountSetup();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  return (
    <>
      <Field
        label={S.email}
        ltr
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <Field
        label={S.password}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={password}
        onChangeText={setPassword}
      />
      <Field
        label={S.confirm}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirm}
        onChangeText={setConfirm}
      />
      {setup.error ? <AuthAlert text={setup.error} /> : null}
      <Button
        label={setup.busy ? S.submitting : S.submit}
        busy={setup.busy}
        onPress={() => void setup.save({ email, password, confirm })}
      />
    </>
  );
}
