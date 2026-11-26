import { View } from 'react-native';
import { AuthAlert, AuthHint, Button, t } from '@ab/mobile-kit';
import { CountryPicker } from '@/sign-in/phone/CountryPicker';
import { PhoneField } from '@/sign-in/phone/PhoneField';
import { progressIcon } from '@/sign-in/progress';
import type { PhoneStepProps } from './PhoneStep.types';
import { usePhoneStep } from './use-phone-step';

/** The send button waits for a whole number and shows progress while the code is requested. */
export function PhoneStep({ sign }: PhoneStepProps) {
  const { flow, phone, picking, setPicking, bad } = usePhoneStep({ sign });
  return (
    <View style={{ gap: 12 }}>
      <PhoneField
        country={phone.country}
        typed={phone.typed}
        onTyped={phone.setTyped}
        onCountry={() => setPicking(true)}
        state={phone.check.state}
        onSubmit={() => void sign.send()}
      />
      <AuthHint
        text={bad ? t.familyApp.signIn.phoneBad : t.familyApp.signIn.phoneHint}
        tone={bad ? 'bad' : 'quiet'}
      />
      {flow.error ? <AuthAlert text={flow.error} /> : null}
      <Button
        label={flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
        busy={flow.busy}
        disabled={phone.check.state !== 'ok'}
        icon={progressIcon(flow.busy)}
        onPress={() => void sign.send()}
      />
      <CountryPicker
        open={picking}
        current={phone.country}
        onPick={(c) => {
          phone.setCountry(c);
          setPicking(false);
        }}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}
