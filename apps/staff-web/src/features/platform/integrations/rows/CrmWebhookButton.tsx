import { Button } from '@ab/web-kit/components/ui/form/button';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { crmWebhookProblem, useCrmWebhook } from '@/features/platform/integrations/use-crm-webhook';

const s = t.integrations.crmWebhook;

/** docs/19 crm driver: the webhook secret never reaches this page. */
export function CrmWebhookButton({ onNote }: { onNote: (message: string) => void }) {
  const link = useCrmWebhook();
  return (
    <div className="grid gap-1 py-2">
      <div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={link.isPending}
          onClick={() => link.mutate(undefined, { onSuccess: () => onNote(s.done) })}
        >
          {link.isPending ? s.pending : s.button}
        </Button>
      </div>
      <p className="text-xs text-ink-3">{s.hint}</p>
      {link.isError && <FormAlert>{crmWebhookProblem(link.error)}</FormAlert>}
    </div>
  );
}
