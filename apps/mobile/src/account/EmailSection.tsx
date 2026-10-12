import type { AccountProfile } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { ltr } from '@/ui/Ltr';
import { changeEmail } from './account-api';
import { accountMessage } from './account-errors';
import { AccountCard } from './AccountCard';
import { AccountField, passwordInput } from './AccountField';
import { useAccountAction } from './use-account-action';

/** «البريد الإلكتروني» (R-ACC-03): the sign-in email, changed at once, with the current password. */
export function EmailSection({ profile }: { profile: AccountProfile }) {
  const { color } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAccountAction({
    run: changeEmail,
    success: t.account.toast.email,
    onDone: () => {
      setEmail('');
      setPassword('');
    },
  });
  const typed = email.trim();

  const save = () => {
    const found = {
      ...(typed.includes('@') ? {} : { email: accountMessage('invalid_email') }),
      ...(password === '' ? { current_password: accountMessage('password_required') } : {}),
    };
    if (Object.keys(found).length > 0) return action.reject(found);
    action.submit({ email: typed, current_password: password });
  };

  return (
    <AccountCard
      title={t.account.email.title}
      onSave={save}
      pending={action.pending}
      disabled={typed === ''}
      error={action.errors.form}
      notice={action.notice}
    >
      <AppText
        style={{ fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 }}
      >
        {profile.email ? t.account.email.current.replace('{email}', ltr(profile.email)) : t.account.mobile.emailNone}
      </AppText>
      <AccountField
        label={t.account.email.label}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        ltr
        hint={t.account.email.hint}
        error={action.errors.email}
      />
      <AccountField
        {...passwordInput(t.account.currentPassword)}
        value={password}
        onChangeText={setPassword}
        error={action.errors.current_password}
      />
    </AccountCard>
  );
}
