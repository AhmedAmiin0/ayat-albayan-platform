import type { AccountProfile } from '@ab/shared';
import { useState } from 'react';
import {
  t,
  Button,
  accountMessage,
  AccountCard,
  AccountField,
  passwordInput,
  useAccountAction,
} from '@ab/mobile-kit';
import { patchProfile } from '@/account/hooks/account-api';

/** R-ACC-02: E.164 normalised by the API; changing or removing needs the current password. */
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
    if (password === '') {
      action.reject({ current_password: accountMessage('password_required') });
      return;
    }
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
        <Button variant="danger" label={t.account.phone.remove} onPress={() => setPhone('')} />
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
