import { checkPhone, defaultCountry } from '@ab/client-core';
import { useState } from 'react';
import { View } from 'react-native';
import { t, Button, ErrorLine, Field, Note } from '@ab/mobile-kit';

/** Numbers start in Saudi Arabia; another country's is typed whole with «+». */
const COUNTRY = defaultCountry(null);
const P = () => t.shortLinks.people;
const F = () => t.shortLinks.form;

/** A number not on the platform, checked as E.164 before it joins the list. */
export function PhoneAdder({ onAdd }: { onAdd: (e164: string) => void }) {
  const [typed, setTyped] = useState('');
  const [bad, setBad] = useState(false);
  const add = () => {
    const { e164 } = checkPhone(COUNTRY, typed);
    setBad(e164 === null);
    if (e164 === null) return;
    onAdd(e164);
    setTyped('');
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Field
            label={P().notOnPlatform}
            ltr
            keyboardType="phone-pad"
            placeholder={COUNTRY.dial}
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={add}
          />
        </View>
        <Button variant="secondary" label={F().add} onPress={add} />
      </View>
      {bad ? <ErrorLine message={t.shortLinks.gate.errors.invalid_phone} /> : null}
      <Note>{F().phoneHint}</Note>
    </View>
  );
}
