import type { AccountProfile } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { patchProfile } from './account-api';
import { accountMessage } from './account-errors';
import { AccountCard } from './AccountCard';
import { AccountField, passwordInput } from './AccountField';
import { useAccountAction } from './use-account-action';

/**
 * «رقم الهاتف» (R-ACC-02): E.164 typed with its country code (the API normalises and checks it);
 * a change, or removing it, needs the current password.
 */
export function PhoneSection({ profile }: { profile: AccountProfile }) {
  const [phone, setPhone] = useState(profile.phone_e164 ?? '');
  const [password, setPassword] = useState('');
  const action = useAccountAction({
    run: patchProfile,
    success: t.account.toast.phone,
    onDone: () => setPassword(''),
  });
  const typed = phone.trim();

  const save = () => {
    if (password === '') return action.reject({ current_password: accountMessage('password_required') });
    action.submit({ phone_e164: typed === '' ? null : typed, current_password: password });
  };

  return (
    <AccountCard
      title={t.account.phone.title}
      onSave={save}
      pending={action.pending}
      disabled={typed === (profile.phone_e164 ?? '')}
      error={action.errors.form}
      notice={action.notice}
    >
      <AccountField
        label={t.account.phone.label}
        value={phone}
        onChangeText={setPhone}
        placeholder={t.account.phone.none}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        ltr
        hint={t.account.phone.hint}
        error={action.errors.phone_e164}
      />
      {typed !== '' ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button variant="ghost" label={t.account.phone.remove} onPress={() => setPhone('')} />
        </View>
      ) : null}
      <AccountField
        {...passwordInput(t.account.currentPassword)}
        value={password}
        onChangeText={setPassword}
        hint={t.account.currentPasswordHint}
        error={action.errors.current_password}
      />
    </AccountCard>
  );
}
