import { Host, TextInput } from '@expo/ui';
import type { FieldInputProps } from '../Field.types';
import { useNativeFieldInput } from './use-native-field-input';

/**
 * @expo/ui's native input in a host as tall as its content. The host lays out in the UI's
 * direction, or left to right for an `ltr` field.
 */
export function NativeFieldInput(props: FieldInputProps) {
  const native = useNativeFieldInput(props);
  return (
    <Host matchContents={{ vertical: true }} layoutDirection={native.layoutDirection}>
      <TextInput {...native.input} />
    </Host>
  );
}
