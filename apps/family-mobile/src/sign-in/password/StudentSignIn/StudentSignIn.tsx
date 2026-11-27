import { View } from 'react-native';
import { Button, ForgotPassword, PasswordSignIn, t } from '@ab/mobile-kit';
import type { StudentSignInProps } from './StudentSignIn.types';
import { useStudentSignIn } from './use-student-sign-in';

/** docs/50 §4: first password and reset use a WhatsApp code; both hide while codes are off. */
export function StudentSignIn({ codes }: StudentSignInProps) {
  const { view, setView, toPassword, checkCode, onResult } = useStudentSignIn();
  if (view !== 'password') return <ForgotPassword key={view} mode={view} onBack={toPassword} />;
  return (
    <View style={{ gap: 16 }}>
      <PasswordSignIn
        label={t.familyApp.signIn.studentCode}
        hint={t.familyAuth.studentUsernameHint}
        check={checkCode}
        onResult={onResult}
      >
        {codes ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Button
              variant="ghost"
              label={t.familyAuth.firstTime}
              onPress={() => setView('firstTime')}
            />
            <Button variant="ghost" label={t.familyAuth.forgot} onPress={() => setView('family')} />
          </View>
        ) : null}
      </PasswordSignIn>
    </View>
  );
}
