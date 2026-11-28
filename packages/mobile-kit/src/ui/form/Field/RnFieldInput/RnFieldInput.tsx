import { TextInput, View } from 'react-native';
import { PasswordToggle } from '../../PasswordToggle';
import type { FieldInputProps } from '../Field.types';
import { useRnFieldInput } from './use-rn-field-input';

/**
 * React Native's input, for a password and a cursor-tracking field. Edge + outline make the 2px
 * ring, so nothing shifts. A password is wrapped in direction 'ltr' (its dots and Latin
 * characters start at the left like the identifier's) and gets the eye toggle at the inline-end.
 */
export function RnFieldInput(props: FieldInputProps) {
  const rn = useRnFieldInput(props);
  return (
    <View style={rn.island}>
      <TextInput
        accessibilityLabel={rn.label}
        placeholderTextColor={rn.color.ink3}
        style={rn.style}
        {...rn.input}
        accessibilityHint={rn.hint}
        onFocus={rn.onFocus}
        onBlur={rn.onBlur}
        secureTextEntry={rn.secure && !rn.shown}
      />
      {rn.secure ? <PasswordToggle shown={rn.shown} onToggle={rn.toggle} /> : null}
    </View>
  );
}
