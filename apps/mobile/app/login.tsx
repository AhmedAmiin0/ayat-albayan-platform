import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { setLoginNotice, useLoginNotice } from '@/auth';
import { signIn } from '@/auth';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { KeyboardFrame } from '@/core/ui/layout/KeyboardFrame';
import { Mark } from '@/core/ui/primitives/Mark';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { AppText } from '@/core/ui/primitives/AppText';

// docs/07 §12: mobile drops the binding cover, frame and cartouche; it keeps the mark, Amiri title,
// 16pt inputs and one lapis button. The error is the §10 inline alert: danger-soft, struck glyph, word.
export default function Login() {
  const { color } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Why the last session ended (account disabled, wrong app), until the next attempt.
  const notice = useLoginNotice();

  const submit = async () => {
    setBusy(true);
    setError(null);
    setLoginNotice(null);
    const res = await signIn({ email: email.trim(), password });
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
        <Field
          label={t.auth.email}
          ltr
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label={t.auth.password}
          secureTextEntry
          autoComplete="current-password"
          value={password}
          onChangeText={setPassword}
        />
        {error ?? notice ? (
          <View
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              borderRadius: shape.radius.md,
              borderWidth: 1,
              borderColor: `${color.bad}59`, // danger at 35 %
              backgroundColor: color.badSoft,
            }}
          >
            <NuqtaGlyph shape="struck" color={color.bad} />
            <AppText
              style={{
                flex: 1,
                fontFamily: type.ui[500],
                fontSize: type.size.sm,
                lineHeight: type.lineHeight(type.size.sm),
                color: color.ink,
              }}
            >
              {error ?? notice}
            </AppText>
          </View>
        ) : null}
        <Button label={busy ? t.auth.submitting : t.auth.submit} onPress={submit} busy={busy} />
      </ScrollView>
    </KeyboardFrame>
  );
}
