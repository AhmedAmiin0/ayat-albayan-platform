import { ACCOUNT_NAME_MAX, ACCOUNT_NAME_MIN, type AccountProfile } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import { patchProfile } from '../hooks/account-api';
import { accountMessage } from '../lib/account-errors';
import { AccountCard } from '../components/AccountCard';
import { AccountField } from '../components/AccountField';
import { useAccountAction } from '../hooks/use-account-action';

const hint = t.account.name.hint.replace('{min}', String(ACCOUNT_NAME_MIN)).replace('{max}', String(ACCOUNT_NAME_MAX));

/** «الاسم» (R-ACC-02): the login's own name; no password needed. */
export function NameSection({ profile }: { profile: AccountProfile }) {
  const [name, setName] = useState(profile.full_name);
  const action = useAccountAction({ run: patchProfile, success: t.account.toast.name });
  const trimmed = name.trim();

  const save = () => {
    if (trimmed.length < ACCOUNT_NAME_MIN) return action.reject({ full_name: accountMessage('name_too_short') });
    if (trimmed.length > ACCOUNT_NAME_MAX) return action.reject({ full_name: accountMessage('name_too_long') });
    action.submit({ full_name: trimmed });
  };

  return (
    <AccountCard
      title={t.account.name.title}
      onSave={save}
      pending={action.pending}
      disabled={trimmed === profile.full_name}
      error={action.errors.form}
      notice={action.notice}
    >
      <AccountField
        label={t.account.name.label}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        maxLength={ACCOUNT_NAME_MAX + 20}
        hint={hint}
        error={action.errors.full_name}
      />
    </AccountCard>
  );
}
