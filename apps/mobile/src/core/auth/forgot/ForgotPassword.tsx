import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { AuthAlert } from './AuthAlert';
import { ForgotCodeStep } from './ForgotCodeStep';
import { type Forgot, useForgot } from './use-forgot';

function IdentifierStep({ forgot }: { forgot: Forgot }) {
  const { color } = useTheme();
  return (
    <>
      <AppText style={{ fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>
        {t.familyAuth.forgotIntro}
      </AppText>
      <Field
        label={t.familyAuth.identifier}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        value={forgot.identifier}
        onChangeText={forgot.setIdentifier}
      />
      {forgot.error ? <AuthAlert text={forgot.error} /> : null}
      <Button
        label={forgot.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
        busy={forgot.busy}
        disabled={forgot.identifier.trim() === ''}
        onPress={() => void forgot.send()}
      />
    </>
  );
}

function Step({ forgot }: { forgot: Forgot }) {
  if (forgot.step === 'unavailable') return <AuthAlert text={t.familyAuth.staffResetByAdmin} />;
  if (forgot.step === 'identifier') return <IdentifierStep forgot={forgot} />;
  if (forgot.step === 'code') return <ForgotCodeStep forgot={forgot} />;
  if (forgot.step === 'done') return <AuthAlert tone="ok" text={t.familyAuth.passwordSaved} />;
  return <AppText>{t.common.loading}</AppText>;
}

/** «نسيت كلمة المرور؟» inside the login screen (docs/30 §7); `onBack` returns to the sign-in form. */
export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const { color } = useTheme();
  const forgot = useForgot();
  return (
    <>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[600], fontSize: type.size.h3, lineHeight: type.lineHeight(type.size.h3, true), color: color.ink }}
      >
        {t.familyAuth.forgotTitle}
      </AppText>
      <Step forgot={forgot} />
      <Button
        variant={forgot.step === 'done' ? 'primary' : 'ghost'}
        label={t.familyAuth.backToLogin}
        onPress={onBack}
      />
    </>
  );
}
