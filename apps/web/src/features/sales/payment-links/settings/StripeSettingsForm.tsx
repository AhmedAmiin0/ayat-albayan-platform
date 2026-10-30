import type { StripeAdminSettings, StripeSettingsPatch } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type SubmitEvent } from 'react';
import { CheckField } from '@/components/settings/fields/CheckField';
import { NumberField } from '@/components/settings/fields/NumberField';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { patchStripeSettings, stripeSettingsQuery } from '../api';
import { SecretField } from './SecretField';
import { draftOf, serverProblems, settingsPatch, type StripeDraft, type StripeProblems } from './settings-patch';
import { WebhookUrlField } from './WebhookUrlField';

const S = t.paymentLinks.settings;

type Props = { settings: StripeAdminSettings; onSaved: (message: string) => void };

/**
 * The switch, the restricted key and the webhook secret (write-only; «حذف» clears one at once), the
 * discount cap and the webhook URL to copy. «حفظ» sends one PATCH; a saved answer empties the secrets.
 */
export function StripeSettingsForm({ settings, onSaved }: Props) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<StripeDraft>(() => draftOf(settings));
  const [problems, setProblems] = useState<StripeProblems>({});
  const set = (patch: Partial<StripeDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const save = useMutation({
    mutationFn: patchStripeSettings,
    onSuccess: (next, sent) => {
      queryClient.setQueryData(stripeSettingsQuery.queryKey, next);
      setDraft((d) => ({ ...d, enabled: next.enabled, ...(sent.apiKey !== undefined ? { apiKey: '' } : {}), ...(sent.webhookSecret !== undefined ? { webhookSecret: '' } : {}) }));
      onSaved(S.saved);
    },
    onError: (e) => setProblems(serverProblems(e) ?? {}),
  });
  const send = (patch: StripeSettingsPatch) => {
    setProblems({});
    save.mutate(patch);
  };
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const checked = settingsPatch(draft);
    if (checked.ok) send(checked.patch);
    else setProblems(checked.problems);
  };
  const generic = save.isError && !serverProblems(save.error);
  return (
    <form className="grid" onSubmit={submit} noValidate>
      <CheckField label={S.enabled} checked={draft.enabled} onChange={(enabled) => set({ enabled })} />
      <SecretField
        label={S.apiKey}
        state={settings.api_key}
        value={draft.apiKey}
        onChange={(apiKey) => set({ apiKey })}
        onClear={() => send({ apiKey: null })}
        error={problems.apiKey}
        busy={save.isPending}
      />
      <SecretField
        label={S.webhookSecret}
        state={settings.webhook_secret}
        value={draft.webhookSecret}
        onChange={(webhookSecret) => set({ webhookSecret })}
        onClear={() => send({ webhookSecret: null })}
        error={problems.webhookSecret}
        busy={save.isPending}
      />
      <NumberField
        label={S.maxDiscount}
        hint={S.maxDiscountHint}
        value={draft.maxDiscount}
        onChange={(maxDiscount) => set({ maxDiscount })}
        {...(problems.maxDiscount ? { error: problems.maxDiscount } : {})}
      />
      <WebhookUrlField url={settings.webhook_url} onNote={onSaved} />
      {generic && <FormAlert>{t.common.error}</FormAlert>}
      <Button type="submit" className="mt-3 justify-self-start" disabled={save.isPending}>
        {S.save}
      </Button>
    </form>
  );
}
