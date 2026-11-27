import { TextInput, View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { CodeBox } from '@/sign-in/whatsapp/CodeBox';
import { codeDigits } from '@ab/client-core';
import type { CodeBoxesProps } from './CodeBoxes.types';
import { BOXES } from './code-boxes.helpers';
import { useCodeBoxes } from './use-code-boxes';

/** One near-invisible real input over six boxes so paste and OS autofill fill every box. */
export function CodeBoxes({ value, onChange, refused }: CodeBoxesProps) {
  const { setFocused, look } = useCodeBoxes({ value, refused });
  return (
    <View style={{ direction: 'ltr' }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}
      >
        {BOXES.map((i) => (
          <CodeBox key={i} digit={value[i] ?? ''} look={look(i)} />
        ))}
      </View>
      <TextInput
        accessibilityLabel={t.familyAuth.code}
        value={value}
        onChangeText={(raw) => onChange(codeDigits(raw))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        caretHidden
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          start: 0,
          end: 0,
          opacity: 0.02,
          color: 'transparent',
          fontSize: 1,
        }}
      />
    </View>
  );
}
