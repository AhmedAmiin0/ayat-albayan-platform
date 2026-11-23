import { useState } from 'react';
import { View } from 'react-native';
import { AuthAlert, AuthHint, Button, t } from '@ab/mobile-kit';
import { CountryPicker } from '#/sign-in/phone/CountryPicker.tsx';
import { PhoneField } from '#/sign-in/phone/PhoneField.tsx';
import { progressIcon } from '#/sign-in/progress.tsx';
import type { WhatsAppSignIn } from './use-whatsapp-sign-in';

/**
 * Step 1: the WhatsApp number with its country, the hint (or, once it cannot be right, why) and
 * «أرسل الرمز», which waits for a whole number and shows progress while the code is asked for.
 */
export function PhoneStep({ sign }: { sign: WhatsAppSignIn }) {
  const { flow, phone } = sign;
  const [picking, setPicking] = useState(false);
  const bad = phone.check.state === 'bad';
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
