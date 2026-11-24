import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AuthHint, Button, StepStage, t, useA11yPref, useStepMotion } from '@ab/mobile-kit';
import { StudentSignIn } from '@/sign-in/password';
import { WhatsAppSignIn } from '@/sign-in/whatsapp';
import { firstWay, OTHER_WAY, type SignInWay, WAY_DIRECTION } from '@ab/client-core';

const WAYS: Record<SignInWay, (codes: boolean) => ReactNode> = {
  whatsapp: () => <WhatsAppSignIn />,
  password: (codes) => <StudentSignIn codes={codes} />,
};

const SWITCH: Record<SignInWay, () => string> = {
  whatsapp: () => t.familyApp.signIn.withWhatsApp,
  password: () => t.familyApp.signIn.withPassword,
};

/** docs/50 §4: one sign-in for guardians and students; WhatsApp first, password one tap away. */
export function SignInWays({ codes }: { codes: boolean }) {
  const still = useA11yPref('reduceMotion');
  const motion = useStepMotion<SignInWay>(firstWay(codes), still);
  const other = OTHER_WAY[motion.current];
  return (
    <View style={{ gap: 8 }}>
      <StepStage motion={motion} still={still} render={(way) => WAYS[way](codes)} />
      {codes ? (
        <Button
          variant="ghost"
          label={SWITCH[other]()}
          onPress={() => motion.go(other, WAY_DIRECTION[other])}
        />
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <AuthHint text={t.familyApp.signIn.whatsappOff} />
        </View>
      )}
    </View>
  );
}
