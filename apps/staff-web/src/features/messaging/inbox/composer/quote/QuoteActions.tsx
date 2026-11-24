import { Button } from '@ab/web-kit/components/ui/form/button';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface QuoteActionsProps {
  /** Outside the 24 h window only copying works. */
  open: boolean;
  /** No quote yet, or the previous choice's: nothing may leave. */
  ready: boolean;
  sending: boolean;
  onSend: () => void;
  onEdit: () => void;
  onCopy: () => void;
}

export function QuoteActions(p: QuoteActionsProps) {
  const off = !p.open || !p.ready;
  return (
    <>
      <Button variant="ghost" disabled={!p.ready} onClick={p.onCopy}>
        {t.inbox.quote.copy}
      </Button>
      <Button variant="secondary" disabled={off || p.sending} onClick={p.onEdit}>
        {t.inbox.quote.edit}
      </Button>
      <Button disabled={off || p.sending} onClick={p.onSend}>
        {p.sending ? t.inbox.composer.sending : t.inbox.quote.send}
      </Button>
    </>
  );
}
