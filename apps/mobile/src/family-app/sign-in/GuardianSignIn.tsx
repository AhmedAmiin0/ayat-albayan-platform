import { AuthAlert, authApi, CodeSignIn } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { useFamilyCodes } from './use-family-codes';

/**
 * A guardian (or an adult student who is their own contact): WhatsApp number → code → session
 * (POST /auth/code/request | verify, docs/30 §1). While codes are off the path is hidden and the
 * note says the student can still use their code and password.
 */
export function GuardianSignIn() {
  const open = useFamilyCodes();
  if (open === undefined) return <AppText>{t.common.loading}</AppText>;
  return open ? (
    <CodeSignIn codes={authApi.familyCodes} intro={t.familyApp.signIn.guardianIntro} />
  ) : (
    <AuthAlert text={t.familyApp.signIn.codesOff} />
  );
}
