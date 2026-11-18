import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { type BoxLook, CodeBox } from './CodeBox';
import { CODE_LENGTH, codeDigits } from '@ab/client-core';

interface CodeBoxesProps {
  value: string;
  onChange: (code: string) => void;
  /** The last try was refused: the boxes' edge says so. */
  refused: boolean;
}

const BOXES = Array.from({ length: CODE_LENGTH }, (_, i) => i);

/**
 * The one-time code as six boxes (docs/50 §4). One real input lies over them, nearly invisible:
 * it takes the keyboard, a long-press «لصق» of WhatsApp's «copy code» (or the keyboard's clipboard
 * chip), so a paste fills every box at once; the OS's code autofill where it offers one. The
 * boxes only draw it (hidden from screen readers), LTR in both languages.
 */
export function CodeBoxes({ value, onChange, refused }: CodeBoxesProps) {
  const [focused, setFocused] = useState(true);
  const look = (i: number): BoxLook => {
    const here = focused && i === Math.min(value.length, CODE_LENGTH - 1);
    const ring: BoxLook = here ? 'next' : 'rest';
    return refused ? 'refused' : ring;
  };
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
