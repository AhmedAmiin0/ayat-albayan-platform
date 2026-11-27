import { t } from '../../../lib/i18n/i18n';
import { type, useTheme } from '../../../theme';
import { AppText } from '../../../ui/primitives/AppText';
import { Button } from '../../../ui/primitives/Button';
import type { ForgotPasswordProps } from './ForgotPassword.types';
import { Step } from './Step';
import { useForgotPassword } from './use-forgot-password';

/** Inside a login screen (docs/30 §7). */
export function ForgotPassword({ onBack, mode }: ForgotPasswordProps) {
  const { color } = useTheme();
  const { forgot, title, backVariant, ...step } = useForgotPassword({ mode });
  return (
    <>
      <AppText
        accessibilityRole="header"
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.h3,
          lineHeight: type.lineHeight(type.size.h3, true),
          color: color.ink,
        }}
      >
        {title}
      </AppText>
      <Step forgot={forgot} mode={step.mode} />
      <Button variant={backVariant} label={t.familyAuth.backToLogin} onPress={onBack} />
    </>
  );
}
