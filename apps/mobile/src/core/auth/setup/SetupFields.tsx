import { useState } from 'react';
import { AuthAlert } from '@/core/auth/forgot';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { useAccountSetup } from './use-account-setup';

const S = t.teacherAuth.setup;

/** Email, password twice, the refusal and «احفظ وتابع» (docs/46 A4). */
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
