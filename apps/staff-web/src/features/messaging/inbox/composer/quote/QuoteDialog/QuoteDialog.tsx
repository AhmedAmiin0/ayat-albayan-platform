import { FormAlert, Dialog, Toast, t } from '@ab/web-kit';
import { fillComposer } from '@/features/messaging/inbox/saved-replies/lib/filter';
import {
  getDraft,
  keptFailed,
  setDraft,
} from '@/features/messaging/inbox/composer/lib/draft-store';
import { sendErrorText } from '@/features/messaging/inbox/composer/lib/send-error';
import { useMaySend } from '@/features/messaging/inbox/shared/may-send';
import { QuoteActions } from '@/features/messaging/inbox/composer/quote/QuoteActions';
import { useQuoteCopy } from '@/features/messaging/inbox/composer/quote/use-quote-copy';
import {
  useQuoteOffer,
  useQuoteSend,
} from '@/features/messaging/inbox/composer/quote/use-quote-offer';
import { QuoteChoices } from './QuoteChoices';
import type { QuoteDialogProps } from './QuoteDialog.types';
import { QuotePreview } from './QuotePreview';

const COPY_TOAST = {
  ok: { tone: 'info', message: t.inbox.quote.copied },
  failed: { tone: 'error', message: t.inbox.quote.copyFailed },
} as const;

/** Works for a lead with no student and creates nothing; sending follows useMaySend. */
export function QuoteDialog({ thread, onClose, onFilled }: QuoteDialogProps) {
  const phone = thread.phone_e164;
  const offer = useQuoteOffer(phone);
  const sender = useQuoteSend(phone, onClose);
  const clip = useQuoteCopy();
  const may = useMaySend(thread);
  const { text } = offer;
  // An invalid custom amount blocks sending like a stale price does.
  const held = offer.stale || offer.invalid;
  const withText = (act: (shown: string) => void) => () => {
    if (text !== null) act(text);
  };
  const edit = (shown: string) => {
    const now = getDraft(phone);
    setDraft(phone, { text: fillComposer(now.text, shown), failed: keptFailed(now.failed) });
    onFilled();
    onClose();
  };
  const actions = (
    <QuoteActions
      open={may}
      ready={text !== null && !held}
      sending={sender.pending}
      onSend={withText(sender.send)}
      onEdit={withText(edit)}
      onCopy={withText(clip.copy)}
    />
  );
  return (
    <Dialog title={t.inbox.quote.title} onClose={onClose} actions={actions}>
      <div className="grid gap-5">
        <QuoteChoices phone={phone} {...offer.steps} />
        <QuotePreview text={text} held={held} query={offer.query} />
        {!may && (
          <p className="rounded-md bg-gold-wash px-3 py-2 text-xs text-ink">
            {t.inbox.sessionClosed}
          </p>
        )}
        {sender.error && <FormAlert>{sendErrorText(sender.error)}</FormAlert>}
      </div>
      {clip.copied && <Toast {...COPY_TOAST[clip.copied]} onDismiss={clip.dismiss} />}
    </Dialog>
  );
}
