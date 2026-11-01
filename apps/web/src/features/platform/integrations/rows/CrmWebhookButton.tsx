import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { crmWebhookProblem, useCrmWebhook } from '@/features/platform/integrations/use-crm-webhook';

const s = t.integrations.crmWebhook;

/**
 * Under the CRM group of «التكاملات» (docs/19 «crm driver»): one click registers the CRM's
 * delivery-ticks webhook with the notifications line's key; its secret never reaches this page.
 */
export function CrmWebhookButton({ onNote }: { onNote: (message: string) => void }) {
  const link = useCrmWebhook();
  return (
    <div className="grid gap-1 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={link.isPending}
          onClick={() => link.mutate(undefined, { onSuccess: () => onNote(s.done) })}
        >
          {link.isPending ? s.pending : s.button}
        </Button>
        {link.isSuccess && <p role="status" className="text-xs text-ink-2">{s.done}</p>}
      </div>
      <p className="text-xs text-ink-3">{s.hint}</p>
      {link.isError && <FormAlert>{crmWebhookProblem(link.error)}</FormAlert>}
    </div>
  );
}
