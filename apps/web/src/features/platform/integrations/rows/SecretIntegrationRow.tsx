import { integrationSecretCheck, isIntegrationSecretKey, type IntegrationConfigItem } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { SettingRow } from '@/components/settings/fields/SettingRow';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { stripeFeatureQuery } from '@/features/sales/payment-links';
import { DeveloperKey } from './DeveloperKey';
import { sendGateQuery } from '@/features/messaging/messaging/api';
import { clearIntegrationSecret, integrationsQuery, putIntegrationSecret } from '@/features/platform/integrations/integrations-api';
import { integrationText } from '@/features/platform/integrations/integrations-form';
import { SecretStatusChip } from './SecretStatusChip';

const s = t.integrations;

/**
 * A secret (token, app secret, API key): never prefilled, never shown. A status chip, a password
 * field with «حفظ القيمة», and «مسح» (after a confirm) when it is saved in settings. A key with a
 * format of its own (a Stripe key: sandbox only) is checked before it leaves, as the API checks it.
 */
export function SecretIntegrationRow({ item, onNote }: { item: IntegrationConfigItem; onNote: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');
  const [confirming, setConfirming] = useState(false);
  const words = integrationText(item.key);
  const done = (data: unknown, message: string) => {
    if (Array.isArray(data)) queryClient.setQueryData(integrationsQuery.queryKey, data);
    else void queryClient.invalidateQueries({ queryKey: integrationsQuery.queryKey });
    void queryClient.invalidateQueries({ queryKey: sendGateQuery.queryKey }); // a token decides «configured»
    // A Stripe key decides whether online payment is ready (GET /stripe/feature).
    void queryClient.invalidateQueries({ queryKey: stripeFeatureQuery.queryKey });
    onNote(message);
  };
  const save = useMutation({
    mutationFn: putIntegrationSecret,
    onSuccess: (data) => {
      setValue('');
      done(data, s.secretStored);
    },
  });
  const clear = useMutation({
    mutationFn: clearIntegrationSecret,
    onSuccess: (data) => {
      setConfirming(false);
      done(data, s.secretCleared);
    },
  });
  if (!isIntegrationSecretKey(item.key)) return null;
  const key = item.key;
  const typed = value.trim();
  const invalid = typed !== '' && !integrationSecretCheck(key).safeParse(typed).success;
  return (
    <SettingRow
      label={words.label}
      hint={words.hint}
      error={invalid ? s.invalid : undefined}
      extra={
        <>
          <SecretStatusChip item={item} />
          <DeveloperKey name={item.key} />
        </>
      }
    >
      {(p) => (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            {...p}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            spellCheck={false}
            className="w-full font-mono text-sm sm:w-[220px]"
            placeholder={s.secretPlaceholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="button" size="sm" disabled={typed === '' || invalid || save.isPending} onClick={() => save.mutate({ key, value: typed })}>
            {s.saveSecret}
          </Button>
          {item.source === 'db' && (
            <Button type="button" size="sm" variant="danger-quiet" onClick={() => setConfirming(true)}>
              {s.clearSecret}
            </Button>
          )}
          {(save.isError || clear.isError) && <FormAlert>{t.common.error}</FormAlert>}
          {confirming && (
            <Dialog
              compact
              title={s.clearSecret}
              onClose={() => setConfirming(false)}
              actions={
                <>
                  <Button variant="ghost" autoFocus onClick={() => setConfirming(false)}>{t.common.cancel}</Button>
                  <Button variant="danger" disabled={clear.isPending} onClick={() => clear.mutate(key)}>{s.clearSecret}</Button>
                </>
              }
            >
              <p>{s.clearConfirm.replace('{key}', words.label)}</p>
            </Dialog>
          )}
        </div>
      )}
    </SettingRow>
  );
}
