import { t } from '../../lib/i18n/i18n';
import { type, useTheme } from '../../theme';
import { AppText } from '../../ui/primitives/AppText';
import { Button } from '../../ui/primitives/Button';
import { Field } from '../../ui/form/Field';
import { AuthAlert } from './AuthAlert';
import { AuthHint } from './AuthHint';
import { ForgotCodeStep } from './ForgotCodeStep';
import { type ForgotMode, forgotWords } from './forgot-words';
import { type Forgot, useForgot } from './use-forgot';

interface StepProps {
  forgot: Forgot;
  mode: ForgotMode;
}

function IdentifierStep({ forgot, mode }: StepProps) {
  const { color } = useTheme();
  const words = forgotWords(mode);
  return (
    <>
      <AppText style={{ fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}>
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
        label={forgot.busy ? t.familyAuth.sending : t.familyAuth.sendCode}
        busy={forgot.busy}
        disabled={forgot.identifier.trim() === ''}
        onPress={() => void forgot.send()}
      />
    </>
  );
}

function Step({ forgot, mode }: StepProps) {
  if (forgot.step === 'unavailable') return <AuthAlert text={forgotWords(mode).unavailable} />;
  if (forgot.step === 'identifier') return <IdentifierStep forgot={forgot} mode={mode} />;
  if (forgot.step === 'code') return <ForgotCodeStep forgot={forgot} />;
  if (forgot.step === 'done') return <AuthAlert tone="ok" text={t.familyAuth.passwordSaved} />;
  return <AppText>{t.common.loading}</AppText>;
}

interface ForgotPasswordProps {
  /** Returns to the sign-in form. */
  onBack: () => void;
  mode?: ForgotMode;
}

/** Inside a login screen (docs/30 §7). */
export function ForgotPassword({ onBack, mode = 'staff' }: ForgotPasswordProps) {
  const { color } = useTheme();
  const forgot = useForgot(forgotWords(mode).side);
  return (
    <>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[600], fontSize: type.size.h3, lineHeight: type.lineHeight(type.size.h3, true), color: color.ink }}
      >
        {forgotWords(mode).title}
      </AppText>
      <Step forgot={forgot} mode={mode} />
      <Button
        variant={forgot.step === 'done' ? 'primary' : 'ghost'}
        label={t.familyAuth.backToLogin}
        onPress={onBack}
      />
    </>
  );
}
