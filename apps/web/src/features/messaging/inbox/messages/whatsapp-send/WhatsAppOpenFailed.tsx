import type { MessageView } from '@ab/shared';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { t } from '@/lib/i18n/i18n';
import { useWhatsAppUndo, whatsappWebUrl } from './use-whatsapp-send';

/**
 * Marked sent from WhatsApp, but WhatsApp Web did not open (the browser blocked the tab): open
 * it now with a plain link, or «تراجع» puts the text back in the queue (retry → queued).
 */
export function WhatsAppOpenFailed({ message: m }: { message: MessageView }) {
  const undo = useWhatsAppUndo();
  return (
    <div className="mt-2 grid gap-2 border-t border-rule pt-2 text-2xs text-danger">
      <span role="alert">{t.messages.whatsappSend.openFailed}</span>
      <span className="flex flex-wrap gap-2">
        <a
          href={whatsappWebUrl(m)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: 'secondary', size: 'sm' })}
        >
          {t.messages.whatsappSend.openAgain}
        </a>
        <Button size="sm" variant="ghost" disabled={undo.isPending} onClick={() => undo.mutate(m.id)}>
          {t.messages.whatsappSend.undo}
        </Button>
      </span>
      {undo.isError && <span role="alert">{t.messages.whatsappSend.undoFailed}</span>}
    </div>
  );
}
