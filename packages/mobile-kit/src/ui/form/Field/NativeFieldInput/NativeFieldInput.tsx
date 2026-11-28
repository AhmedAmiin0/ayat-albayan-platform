import { TextInput } from '@expo/ui';
import { ExpoHost } from '../../../surface/ExpoHost';
import type { FieldInputProps } from '../Field.types';
import { useNativeFieldInput } from './use-native-field-input';

/**
 * @expo/ui's native input in the kit host, as tall as its content: the app's theme and direction,
 * or left to right for an `ltr` field.
 */
export function NativeFieldInput(props: FieldInputProps) {
  const native = useNativeFieldInput(props);
  return (
    <ExpoHost matchContents={{ vertical: true }} ltr={props.ltr}>
      <TextInput {...native.input} />
    </ExpoHost>
  );
}
