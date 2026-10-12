import { t } from '@/lib/i18n';
import { AppearancePicker } from '@/more/AppearancePicker';
import { LanguageRow } from '@/more/LanguageRow';
import { SignOutButton } from '@/teacher/SignOutButton';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

/** The classroom assistant's «المزيد»: the appearance, the language and sign-out. */
export function AssistantMoreScreen() {
  return (
    <Screen>
      <ScreenHeader title={t.mobile.more} subtitle={t.mobileRoles.assistantRole} />
      <AppearancePicker />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
