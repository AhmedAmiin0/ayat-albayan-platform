import { formatPhone } from '@ab/core';
import { Fragment, type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { AppText, AuthAlert, Button, ltr, ResendButton, t, type, useTheme } from '@ab/mobile-kit';
import { progressIcon } from '@/sign-in/progress';
import { CodeBoxes } from './CodeBoxes';
import { CODE_STEP_ACTIONS, type CodeStepAction, isWholeCode } from '@ab/client-core';
import type { WhatsAppSignIn } from './use-whatsapp-sign-in';

/** Resend then change number, in the order every code step uses (client-core). */
const ACTIONS: Record<CodeStepAction, (sign: WhatsAppSignIn) => ReactNode> = {
  resend: (sign) => (
    <ResendButton
      resendIn={sign.flow.resendIn}
      busy={sign.flow.busy}
      onPress={() => void sign.resend()}
    />
  ),
  back: (sign) => (
    <Button variant="ghost" label={t.familyAuth.changePhone} onPress={sign.changePhone} />
  ),
};

/** The sixth digit signs in without a tap; a refused code empties the boxes for the next try. */
export function CodeStep({ sign }: { sign: WhatsAppSignIn }) {
  const { color } = useTheme();
  const { flow } = sign;
  const [code, setCode] = useState('');
  const verify = async (next: string) => {
    const refused = await sign.verify(next);
    // Only the refused code goes: digits typed meanwhile stay.
    if (refused !== null) setCode((now) => (now === next ? '' : now));
  };
  const change = (next: string) => {
    setCode(next);
    if (isWholeCode(next) && next !== code && !flow.busy) void verify(next);
  };
  const to = ltr(formatPhone(flow.target ?? ''));
  return (
    <View style={{ gap: 14 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], fontSize: type.size.h4, color: color.ink }}
      >
        {t.familyApp.signIn.codeTitle}
      </AppText>
      <AppText style={{ fontSize: type.size.sm, lineHeight: 22, color: color.ink2 }}>
        {t.familyApp.signIn.codeSentTo.replace('{phone}', to)}
      </AppText>
      <CodeBoxes value={code} onChange={change} refused={flow.error !== null && code === ''} />
      {flow.error ? <AuthAlert text={flow.error} /> : null}
      <Button
        label={flow.busy ? t.familyAuth.verifying : t.familyAuth.verify}
        busy={flow.busy}
        disabled={!isWholeCode(code)}
        icon={progressIcon(flow.busy)}
        onPress={() => void verify(code)}
      />
      {/* One centred column: side by side, an English pair wrapped unevenly (owner 2026-11-15). */}
      <View style={{ alignItems: 'center' }}>
        {CODE_STEP_ACTIONS.map((action) => (
          <Fragment key={action}>{ACTIONS[action](sign)}</Fragment>
        ))}
      </View>
    </View>
  );
}
