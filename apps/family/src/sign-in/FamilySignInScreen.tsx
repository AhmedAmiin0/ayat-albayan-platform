import { type ReactNode, useState } from 'react';
import { SignInFrame, t, type FilterPill, FilterPills } from '@ab/mobile-kit';
import { GuardianSignIn } from './GuardianSignIn';
import { StudentSignIn } from './StudentSignIn';
import { useFamilyCodes } from './use-family-codes';

type Who = 'guardian' | 'student';

const WHO: Record<Who, (codes: boolean) => ReactNode> = {
  guardian: () => <GuardianSignIn />,
  student: (codes) => <StudentSignIn codes={codes} />,
};

const whoPills = (): FilterPill<Who>[] => [
  { value: 'guardian', label: t.familyApp.signIn.guardian },
  { value: 'student', label: t.familyApp.signIn.student },
];

/**
 * The family app's sign-in (docs/50 §6): «ولي الأمر» by WhatsApp code, «الطالب» by student code +
 * password. The auth gate swaps this screen for home once a guardian or student is signed in; a
 * staff login is refused with the inverted «wrongApp» notice.
 */
export function FamilySignInScreen() {
  const [who, setWho] = useState<Who>('guardian');
  const codes = useFamilyCodes() === true;
  return (
    <SignInFrame title={t.familyApp.signIn.title} subtitle={t.familyApp.signIn.intro}>
      <FilterPills
        items={whoPills()}
        value={who}
        onChange={setWho}
        accessibilityLabel={t.familyApp.signIn.tabsLabel}
        role="tablist"
        wrap
      />
      {WHO[who](codes)}
    </SignInFrame>
  );
}
