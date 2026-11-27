import { Fragment } from 'react';
import { View } from 'react-native';
import { AppText, AuthAlert, Button, t, type, useTheme } from '@ab/mobile-kit';
import { CODE_STEP_ACTIONS } from '@ab/client-core';
import { progressIcon } from '@/sign-in/progress';
import { CodeBoxes } from '@/sign-in/whatsapp/CodeBoxes';
import { ACTIONS } from './code-step.actions';
import type { CodeStepProps } from './CodeStep.types';
import { useCodeStep } from './use-code-step';

/** The sixth digit signs in without a tap; a refused code empties the boxes for the next try. */
export function CodeStep({ sign }: CodeStepProps) {
  const { color } = useTheme();
  const { flow, code, verify, change, to, refused, whole } = useCodeStep({ sign });
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
      <CodeBoxes value={code} onChange={change} refused={refused} />
      {flow.error ? <AuthAlert text={flow.error} /> : null}
      <Button
        label={flow.busy ? t.familyAuth.verifying : t.familyAuth.verify}
        busy={flow.busy}
        disabled={!whole}
        icon={progressIcon(flow.busy)}
        onPress={() => void verify(code)}
      />
      {/* One centred column: side by side, an English pair wrapped unevenly. */}
      <View style={{ alignItems: 'center' }}>
        {CODE_STEP_ACTIONS.map((action) => (
          <Fragment key={action}>{ACTIONS[action](sign)}</Fragment>
        ))}
      </View>
    </View>
  );
}
