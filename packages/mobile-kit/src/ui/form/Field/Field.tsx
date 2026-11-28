import { View } from 'react-native';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../primitives/AppText';
import type { FieldProps } from './Field.types';
import { NativeFieldInput } from './NativeFieldInput';
import { RnFieldInput } from './RnFieldInput';
import { useField } from './use-field';

/**
 * Label + 16pt input, 44pt tall (docs/07 §4: the iOS zoom floor and mobile touch size).
 * Edge is the 3:1 ruleInput; focus turns it a 2px lapis ring without moving the text.
 * The label starts at the inline-start (AppText). Free text aligns by what is typed (no textAlign,
 * no writingDirection); an `ltr` field and a password are LTR islands.
 * The input is @expo/ui's native text input; a password or a cursor-tracking field keeps React
 * Native's (use-field.ts says why).
 */
export function Field(props: FieldProps) {
  const { color } = useTheme();
  const field = useField(props);
  return (
    <View style={{ gap: 6 }}>
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs, true),
          color: color.ink2,
        }}
      >
        {field.title}
      </AppText>
      {field.native ? (
        <NativeFieldInput {...field.inputProps} />
      ) : (
        <RnFieldInput {...field.inputProps} />
      )}
    </View>
  );
}
