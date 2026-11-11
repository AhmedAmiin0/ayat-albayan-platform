import { useState } from 'react';
import { AuthAlert, CodeField, ResendButton } from '@/core/auth/forgot';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { type CodeSignIn, useCodeSignIn } from './use-code-sign-in';

function PhoneStep({ flow }: { flow: CodeSignIn }) {
  const { color } = useTheme();
  return (
    <>
      <AppText
        style={{
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink2,
        }}
      >
        {t.teacherAuth.codeIntro}
      </AppText>
      <Field
        label={t.familyAuth.phone}
        ltr
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        value={flow.phone}
        onChangeText={flow.setPhone}
      />
      {flow.error ? <AuthAlert text={flow.error} /> : null}
      <Button
        label={flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
        busy={flow.busy}
        disabled={flow.phone.trim() === ''}
        onPress={() => void flow.send()}
      />
    </>
  );
}

function CodeStep({ flow, target }: { flow: CodeSignIn; target: string }) {
  const [code, setCode] = useState('');
  return (
    <>
      <AuthAlert tone="ok" text={t.familyAuth.codeSent} />
      <CodeField value={code} onChange={setCode} />
      {flow.error ? <AuthAlert text={flow.error} /> : null}
      <Button
        label={flow.busy ? t.familyAuth.verifying : t.familyAuth.verify}
        busy={flow.busy}
        onPress={() => void flow.verify(code)}
      />
      <ResendButton
        resendIn={flow.resendIn}
        busy={flow.busy}
        onPress={() => void flow.send(target)}
      />
      <Button variant="ghost" label={t.familyAuth.changePhone} onPress={flow.changePhone} />
    </>
  );
}

/**
 * «الدخول برمز واتساب» inside the login screen (docs/46 A8, OTA only: the teacher types the code).
 * `onBack` returns to the password form.
 */
export function TeacherCodeSignIn({ onBack }: { onBack: () => void }) {
  const flow = useCodeSignIn();
  return (
    <>
      {flow.target === null ? (
        <PhoneStep flow={flow} />
      ) : (
        <CodeStep flow={flow} target={flow.target} />
      )}
      <Button variant="ghost" label={t.teacherAuth.withPassword} onPress={onBack} />
    </>
  );
}
