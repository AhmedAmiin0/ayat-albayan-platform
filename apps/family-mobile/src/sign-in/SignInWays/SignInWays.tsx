import { View } from 'react-native';
import { AuthHint, Button, StepStage, t } from '@ab/mobile-kit';
import { WAYS } from './sign-in-ways.panels';
import type { SignInWaysProps } from './SignInWays.types';
import { useSignInWays } from './use-sign-in-ways';

/** docs/50 §4: one sign-in for guardians and students; WhatsApp first, password one tap away. */
export function SignInWays({ codes }: SignInWaysProps) {
  const { still, motion, switchLabel, switchWay } = useSignInWays({ codes });
  return (
    <View style={{ gap: 8 }}>
      <StepStage motion={motion} still={still} render={(way) => WAYS[way](codes)} />
      {codes ? (
        <Button variant="ghost" label={switchLabel} onPress={switchWay} />
      ) : (
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <AuthHint text={t.familyApp.signIn.whatsappOff} />
        </View>
      )}
    </View>
  );
}
