import { useState } from 'react';
import { View } from 'react-native';
import { Button, ForgotPassword, PasswordSignIn, t } from '@ab/mobile-kit';
import { feel } from '@/sign-in/feedback';
import { studentCodeOnTrack } from '@ab/client-core';

/** password: student code + password; family (forgot) / firstTime: a code to the guardian. */
type StudentView = 'password' | 'family' | 'firstTime';

/** docs/50 §4: first password and reset use a WhatsApp code; both hide while codes are off. */
export function StudentSignIn({ codes }: { codes: boolean }) {
  const [view, setView] = useState<StudentView>('password');
  const toPassword = () => setView('password');
  if (view !== 'password') return <ForgotPassword key={view} mode={view} onBack={toPassword} />;
  return (
    <View style={{ gap: 16 }}>
      <PasswordSignIn
        label={t.familyApp.signIn.studentCode}
        hint={t.familyAuth.studentUsernameHint}
        check={(typed) => (studentCodeOnTrack(typed) ? null : t.familyApp.signIn.studentCodeBad)}
        onResult={(ok) => feel(ok ? null : 'refused')}
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
