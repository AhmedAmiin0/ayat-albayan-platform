import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { AuthAlert, ForgotPassword, setLoginNotice, signIn, useLoginNotice } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { Mark } from '@/core/ui/primitives/Mark';
import { AppText } from '@/core/ui/primitives/AppText';

// docs/07 §12: mobile drops the binding cover, frame and cartouche; it keeps the mark, Amiri title,
// 16pt inputs and one lapis button. The error is the §10 inline alert: danger-soft, struck glyph, word.
export default function Login() {
  const { color } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  // Why the last session ended (account disabled, wrong app), until the next attempt.
  const notice = useLoginNotice();
  const alert = error ?? notice;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setLoginNotice(null);
    const res = await signIn({ identifier: identifier.trim(), password });
    // On success the auth gate swaps this screen for the tabs (Stack.Protected); stay busy till then.
    if (res.ok) return;
    setBusy(false);
    setError(res.error);
  };

  return (
    // The route's root, at the window's top; Android too (edge to edge, the window is not resized).
    <KeyboardFrame inScreen={false} style={{ flex: 1, backgroundColor: color.margin }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Mark size={56} labelled />
          <AppText
            accessibilityRole="header"
            style={{
              fontFamily: type.display,
              fontSize: type.size.h2,
              lineHeight: type.lineHeight(type.size.h2, true),
              color: color.ink,
              textAlign: 'center',
            }}
          >
            {t.auth.loginTitle}
          </AppText>
        </View>
        {forgot ? (
          <ForgotPassword onBack={() => setForgot(false)} />
        ) : (
          <>
            <Field
              label={t.auth.email}
              ltr
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              value={identifier}
              onChangeText={setIdentifier}
            />
            <Field
              label={t.auth.password}
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
            />
            {alert ? <AuthAlert text={alert} /> : null}
            <Button label={busy ? t.auth.submitting : t.auth.submit} onPress={submit} busy={busy} />
            <Button variant="ghost" label={t.familyAuth.forgot} onPress={() => setForgot(true)} />
          </>
        )}
      </ScrollView>
    </KeyboardFrame>
  );
}
