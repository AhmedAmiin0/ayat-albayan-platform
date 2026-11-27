import { t } from '../../../../lib/i18n/i18n';
import { type, useTheme } from '../../../../theme';
import { Field } from '../../../../ui/form/Field';
import { AppText } from '../../../../ui/primitives/AppText';
import { Button } from '../../../../ui/primitives/Button';
import { AuthAlert } from '../../../forgot/AuthAlert';
import type { PhoneStepProps } from '../CodeSignIn.types';

export function PhoneStep({ flow, intro }: PhoneStepProps) {
  const { color } = useTheme();
  const sendLabel = flow.busy ? t.familyAuth.sending : t.familyAuth.sendCode;
  const empty = flow.phone.trim() === '';
  return (
    <>
      <AppText
        style={{
          fontSize: type.size.sm,
          lineHeight: type.lineHeight(type.size.sm),
          color: color.ink2,
        }}
      >
        {intro}
      </AppText>
      <Field
        label={t.familyAuth.phone}
        ltr
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        value={flow.phone}
        onChangeText={flow.setPhone}
      />
      <AppText
        style={{
          fontSize: type.size.xs,
          lineHeight: type.lineHeight(type.size.xs),
          color: color.ink2,
        }}
      >
        {t.familyAuth.phoneHint}
      </AppText>
      {flow.error ? <AuthAlert text={flow.error} /> : null}
      <Button
        label={sendLabel}
        busy={flow.busy}
        disabled={empty}
        onPress={() => void flow.send()}
      />
    </>
  );
}
