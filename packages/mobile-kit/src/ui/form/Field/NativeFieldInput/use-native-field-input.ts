import { type, useTheme } from '../../../../theme';
import { nativeBox } from '../field-box';
import type { FieldInputProps } from '../Field.types';
import { nativeModifiers } from './native-modifiers';
import { useNativeText } from '../../use-native-text';

/**
 * Every Field prop @expo/ui's input has, passed by name. React Native's `textContentType` has no
 * twin: each caller also sets `autoComplete`, which @expo/ui turns into it on iOS.
 */
export function useNativeFieldInput(props: FieldInputProps) {
  const { label, hint, ltr, focused, onFocusChange, input } = props;
  const { color } = useTheme();
  const { text, onChange } = useNativeText(input);
  return {
    layoutDirection: ltr ? ('leftToRight' as const) : undefined,
    input: {
      value: text,
      onChangeText: onChange,
      placeholder: input.placeholder,
      placeholderTextColor: color.ink3,
      autoFocus: input.autoFocus,
      editable: input.editable,
      multiline: input.multiline,
      keyboardType: input.keyboardType,
      inputMode: input.inputMode,
      autoCapitalize: input.autoCapitalize,
      autoCorrect: input.autoCorrect,
      autoComplete: input.autoComplete,
      returnKeyType: input.returnKeyType,
      onSubmitEditing: input.onSubmitEditing,
      maxLength: input.maxLength,
      testID: input.testID,
      onFocus: () => {
        onFocusChange(true);
        input.onFocus?.();
      },
      onBlur: () => {
        onFocusChange(false);
        input.onBlur?.();
      },
      style: nativeBox(color, focused),
      textStyle: { fontFamily: type.ui[400], fontSize: type.size.base, color: color.ink },
      modifiers: nativeModifiers(label, hint),
    },
  };
}
