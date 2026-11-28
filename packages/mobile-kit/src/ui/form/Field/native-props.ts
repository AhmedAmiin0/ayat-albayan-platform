import type { FieldInput } from './Field.types';

/**
 * The Field props @expo/ui's input honours (use-native-field-input.ts passes each one). Any other
 * prop sends the field to React Native's input instead of being dropped: a key handler, a cursor
 * tracker (its RN event), a password (a SecureField in its own host loses the username/password
 * pairing password managers rely on). `textContentType` rides on `autoComplete`, which every
 * caller also sets; `textAlignVertical` is moot because the native field starts at the top.
 */
const NATIVE_PROPS = [
  'value',
  'onChangeText',
  'placeholder',
  'autoFocus',
  'editable',
  'multiline',
  'keyboardType',
  'inputMode',
  'autoCapitalize',
  'autoCorrect',
  'autoComplete',
  'textContentType',
  'returnKeyType',
  'onSubmitEditing',
  'maxLength',
  'testID',
  'onFocus',
  'onBlur',
  'accessibilityHint',
  'textAlignVertical',
] as const satisfies readonly (keyof FieldInput)[];

const native: ReadonlySet<string> = new Set(NATIVE_PROPS);

export const nativeHonours = (input: FieldInput) =>
  Object.keys(input).every((key) => native.has(key));
