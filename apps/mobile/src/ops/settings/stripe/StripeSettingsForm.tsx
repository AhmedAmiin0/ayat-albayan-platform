import { stripeDraftOf, stripeServerProblems, stripeSettingsPatch, type StripeDraft, type StripeProblemKeys } from '@ab/client-core';
import type { StripeAdminSettings, StripeSettingsPatch } from '@ab/shared';
import { useState } from 'react';
import { Switch, View } from 'react-native';
import { copyOrShare } from '@/core/lib/clipboard';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { ErrorLine } from '@/inbox';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { SecretInput } from './SecretInput';
import { problemText } from './stripe-problems';
import { useSaveStripeSettings } from './stripe-settings-api';

const S = t.paymentLinks.settings;

/** The two write-only secrets: the draft field, its label and the saved state's key. */
const SECRETS = [
  { field: 'apiKey', label: () => S.apiKey, saved: 'api_key' },
  { field: 'webhookSecret', label: () => S.webhookSecret, saved: 'webhook_secret' },
] as const;

/**
 * The switch, the restricted key and the webhook secret (write-only, masked; «حذف» clears one at once), the
 * discount cap and the webhook URL to copy. «حفظ» sends one PATCH, checked first as the API checks it.
 */
export function StripeSettingsForm({ settings }: { settings: StripeAdminSettings }) {
  const { color } = useTheme();
  const save = useSaveStripeSettings();
  const [draft, setDraft] = useState<StripeDraft>(() => stripeDraftOf(settings));
  const [problems, setProblems] = useState<StripeProblemKeys | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const set = (patch: Partial<StripeDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const send = (patch: StripeSettingsPatch) => {
    setProblems(null);
    setNote(null);
    save.mutate(patch, {
      onSuccess: (next) => {
        setDraft((d) => ({ ...d, enabled: next.enabled, apiKey: '', webhookSecret: '' }));
        setNote(S.saved);
      },
      onError: (e) => setProblems(stripeServerProblems(e)),
    });
  };
  const submit = () => {
    const checked = stripeSettingsPatch(draft);
    if (checked.ok) send(checked.patch);
    else setProblems(checked.problems);
  };
  const copy = () => void copyOrShare(settings.webhook_url).then((r) => setNote(r === 'failed' ? t.classroom.copyFailed : S.urlCopied));
  const generic = save.isError && !stripeServerProblems(save.error);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <AppText style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>{S.enabled}</AppText>
        <Switch accessibilityLabel={S.enabled} value={draft.enabled} onValueChange={(enabled) => set({ enabled })} />
      </View>
      {SECRETS.map(({ field, label, saved }) => (
        <SecretInput
          key={field}
          label={label()}
          state={settings[saved]}
          value={draft[field]}
          onChange={(value) => set({ [field]: value })}
          onClear={() => send({ [field]: null })}
          error={problemText(problems, field)}
          busy={save.isPending}
        />
      ))}
      <View style={{ gap: 6 }}>
        <Field label={S.maxDiscount} ltr keyboardType="decimal-pad" value={draft.maxDiscount} onChangeText={(maxDiscount) => set({ maxDiscount })} />
        <Note>{S.maxDiscountHint}</Note>
        {problemText(problems, 'maxDiscount') ? <ErrorLine message={problemText(problems, 'maxDiscount') ?? ''} /> : null}
      </View>
      <View style={{ gap: 6 }}>
        <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>{S.webhookUrl}</AppText>
        <AppText selectable style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.lapis }}>
          {ltr(settings.webhook_url)}
        </AppText>
        <Button variant="secondary" label={S.copyUrl} onPress={copy} />
      </View>
      {generic ? <ErrorLine message={t.common.error} /> : null}
      {note ? <Note>{note}</Note> : null}
      <Button label={S.save} onPress={submit} busy={save.isPending} />
    </View>
  );
}
