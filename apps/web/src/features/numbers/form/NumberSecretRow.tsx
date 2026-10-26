import type { NumberSecretName, NumberView } from '@ab/shared';
import { useState } from 'react';
import { ConfirmSwitchDialog } from '@/components/settings/dialogs/ConfirmSwitchDialog';
import { SettingRow } from '@/components/settings/fields/SettingRow';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { numberErrorText } from './number-errors';
import { clearNumberSecret, putNumberSecret } from '../numbers-api';
import { SecretChip } from './SecretChip';
import { useNumbersMutation } from '../use-numbers-mutation';

const s = t.numbers.secret;

export interface NumberSecretRowProps {
  view: NumberView;
  name: NumberSecretName;
  /** numbers.manage: without it only the chip shows. */
  manage: boolean;
}

/**
 * «رمز الوصول» / «السر الخاص بالتطبيق» of one number: a set / not-set chip, a password field with
 * «حفظ» (never prefilled), and «حذف» after a confirm when it is saved.
 */
export function NumberSecretRow({ view, name, manage }: NumberSecretRowProps) {
  const [value, setValue] = useState('');
  const [confirming, setConfirming] = useState(false);
  const save = useNumbersMutation(putNumberSecret, { onDone: () => setValue(''), note: s.saved });
  const clear = useNumbersMutation(clearNumberSecret, { onDone: () => setConfirming(false), note: s.cleared });
  const label = t.numbers.fields[name];
  const state = view.secrets[name];
  if (!manage) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 py-2">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <SecretChip state={state} />
      </div>
    );
  }
  return (
    <SettingRow label={label} extra={<SecretChip state={state} />}>
      {(p) => (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            {...p}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            spellCheck={false}
            className="w-full font-mono text-sm sm:w-[220px]"
            placeholder={s.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            disabled={value.trim() === '' || save.isPending}
            onClick={() => save.mutate({ id: view.id, name, value: value.trim() })}
          >
            {state.set ? s.replace : s.save}
          </Button>
          {state.set && (
            <Button type="button" size="sm" variant="danger-quiet" onClick={() => setConfirming(true)}>
              {s.clear}
            </Button>
          )}
          {save.isError && <FormAlert>{numberErrorText(save.error)}</FormAlert>}
          {confirming && (
            <ConfirmSwitchDialog
              title={`${s.clear}: ${label}`}
              description={s.clearConfirm.replace('{{name}}', label)}
              yes={s.clear}
              onYes={() => clear.mutate({ id: view.id, name })}
              onClose={() => setConfirming(false)}
              pending={clear.isPending}
              failed={clear.isError}
            />
          )}
        </div>
      )}
    </SettingRow>
  );
}
