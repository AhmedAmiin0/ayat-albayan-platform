import type { CodeRoutes } from '@ab/client-core';
import { type ReactNode, useState } from 'react';
import { AuthAlert } from '../../forgot/AuthAlert';
import { CodeField } from '../../forgot/CodeField';
import { ResendButton } from '../../forgot/ResendButton';
import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { Button } from '../../../ui/primitives/Button';
import { Field } from '../../../ui/form/Field';
import { type CodeFlow as CodeSignInFlow, useCodeFlow } from '../use-code-flow';

function PhoneStep({ flow, intro }: { flow: CodeSignInFlow; intro: string }) {
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
        {intro}
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
      <AppText
        style={{
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
        }}
      >
        {t.familyAuth.phoneHint}
      </AppText>
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

function CodeStep({ flow, target }: { flow: CodeSignInFlow; target: string }) {
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

interface CodeSignInProps {
  /** The teacher's routes (default) or the family's (docs/50 §6). */
  codes?: CodeRoutes;
  /** The words above the phone. */
  intro: string;
  /** Under the steps: the way back, other sign-in links. */
  children?: ReactNode;
}

/** docs/46 A8: the person types the code; the auth gate swaps the screen on success. */
export function CodeSignIn({ codes, intro, children }: CodeSignInProps) {
  const flow = useCodeFlow(codes);
  return (
    <>
      {flow.target === null ? (
        <PhoneStep flow={flow} intro={intro} />
      ) : (
        <CodeStep flow={flow} target={flow.target} />
      )}
      {children}
    </>
  );
}
