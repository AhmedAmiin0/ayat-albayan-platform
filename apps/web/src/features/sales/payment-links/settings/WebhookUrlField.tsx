import { SettingRow } from '@/components/settings/fields/SettingRow';
import { Button } from '@/components/ui/form/button';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';

type Props = { url: string; onNote: (message: string) => void };

/** The endpoint the owner pastes into the Stripe sandbox: read-only, with «نسخ». */
export function WebhookUrlField({ url, onNote }: Props) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      onNote(t.paymentLinks.copied);
    } catch {
      onNote(t.paymentLinks.web.copyFailed);
    }
  };
  const action = (
    <Button type="button" size="sm" variant="secondary" onClick={() => void copy()}>
      {t.paymentLinks.copy}
    </Button>
  );
  return (
    <SettingRow label={t.paymentLinks.settings.webhookUrl} actions={action}>
      {(p) => <Input {...p} readOnly dir="ltr" value={url} className="w-[320px] max-w-full" />}
    </SettingRow>
  );
}
