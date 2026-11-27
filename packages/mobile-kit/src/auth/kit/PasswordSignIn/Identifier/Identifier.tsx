import { Field } from '../../../../ui/form/Field';
import { AuthHint } from '../../../forgot/AuthHint';
import type { IdentifierProps } from '../PasswordSignIn.types';

/** The identifier (LTR, the OS's username autofill) and the line under it. */
export function Identifier({ label, value, onChange, note }: IdentifierProps) {
  const tone = note?.bad ? 'bad' : 'quiet';
  return (
    <>
      <Field
        label={label}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        value={value}
        onChangeText={onChange}
      />
      {note ? <AuthHint text={note.text} tone={tone} /> : null}
    </>
  );
}
