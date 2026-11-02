import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { AuthAlert } from './AuthAlert';
import type { Forgot } from './use-forgot';

/** The WhatsApp code + the new password twice; resend comes back after RESEND_SECONDS. */
export function ForgotCodeStep({ forgot }: { forgot: Forgot }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, resendIn } = forgot;
  return (
    <>
      <AuthAlert tone="ok" text={t.familyAuth.codeSent} />
      <Field
        label={t.familyAuth.code}
        ltr
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={12}
        value={code}
        onChangeText={setCode}
      />
      <Field
        label={t.familyAuth.newPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <Field
        label={t.familyAuth.confirmPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        value={confirm}
        onChangeText={setConfirm}
      />
      {forgot.error ? <AuthAlert text={forgot.error} /> : null}
      <Button
        label={busy ? t.familyAuth.saving : t.familyAuth.savePassword}
        busy={busy}
        onPress={() => void forgot.reset({ code, password, confirm })}
      />
      <Button
        variant="ghost"
        label={resendIn > 0 ? t.familyAuth.resendIn.replace('{seconds}', String(resendIn)) : t.familyAuth.resend}
        disabled={busy || resendIn > 0}
        onPress={() => void forgot.send()}
      />
    </>
  );
}
