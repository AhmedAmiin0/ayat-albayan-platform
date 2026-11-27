import { t } from '../../../../lib/i18n/i18n';
import { type, useTheme } from '../../../../theme';
import { Field } from '../../../../ui/form/Field';
import { AppText } from '../../../../ui/primitives/AppText';
import { Button } from '../../../../ui/primitives/Button';
import { AuthAlert } from '../../AuthAlert';
import { AuthHint } from '../../AuthHint';
import { forgotWords } from '../../forgot-words';
import type { StepProps } from '../ForgotPassword.types';

export function IdentifierStep({ forgot, mode }: StepProps) {
  const { color } = useTheme();
  const words = forgotWords(mode);
  const sendLabel = forgot.busy ? t.familyAuth.sending : t.familyAuth.sendCode;
  const empty = forgot.identifier.trim() === '';
  return (
    <>
      <AppText
        style={{
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink2,
        }}
      >
        {words.intro}
      </AppText>
      <Field
        label={words.label}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        value={forgot.identifier}
        onChangeText={forgot.setIdentifier}
      />
      {words.hint ? <AuthHint text={words.hint} /> : null}
      {forgot.error ? <AuthAlert text={forgot.error} /> : null}
      <Button
        label={sendLabel}
        busy={forgot.busy}
        disabled={empty}
        onPress={() => void forgot.send()}
      />
    </>
  );
}
