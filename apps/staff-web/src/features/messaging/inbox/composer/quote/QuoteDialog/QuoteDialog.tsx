import type { ThreadView } from '@ab/shared';
import { useState } from 'react';
import { FormAlert, Dialog, Toast, t, cn } from '@ab/web-kit';
import { CalcSteps } from '@/features/finance/pricing';
import { CustomAmountToggle, CustomPriceField } from '@/features/finance/subscriptions';
import { fillComposer } from '@/features/messaging/inbox/saved-replies/lib/filter';
import { getDraft, keptFailed, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { sendErrorText } from '@/features/messaging/inbox/composer/lib/send-error';
import { useMaySend } from '@/features/messaging/inbox/shared/may-send';
import { QuoteActions } from '@/features/messaging/inbox/composer/quote/QuoteActions';
import { useQuoteOffer, useQuoteSend } from '@/features/messaging/inbox/composer/quote/use-quote-offer';

export interface QuoteDialogProps {
  thread: ThreadView;
  onClose: () => void;
  onFilled: () => void;
}

/** Works for a lead with no student and creates nothing; sending follows useMaySend. */
export function QuoteDialog({ thread, onClose, onFilled }: QuoteDialogProps) {
  const phone = thread.phone_e164;
  const offer = useQuoteOffer(phone);
  const sender = useQuoteSend(phone, onClose);
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const may = useMaySend(thread);
  const text = offer.text;
  // An invalid custom amount blocks sending like a stale price does.
  const held = offer.stale || offer.invalid;
  const ready = text !== null && !held;
  const edit = () => {
    if (!text) return;
    const now = getDraft(phone);
    setDraft(phone, { text: fillComposer(now.text, text), failed: keptFailed(now.failed) });
    onFilled();
    onClose();
  };
  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  };
  const actions = (
    <QuoteActions
      open={may}
      ready={ready}
      sending={sender.pending}
      onSend={() => text && sender.send(text)}
      onEdit={edit}
      onCopy={() => void copy()}
    />
  );
  return (
    <Dialog title={t.inbox.quote.title} onClose={onClose} actions={actions}>
      <div className="grid gap-5">
        <CalcSteps
          sel={offer.sel}
          onChange={offer.change}
          freeDiscount={false}
          discountExtra={<CustomAmountToggle {...offer.custom.toggle} />}
        />
        <CustomPriceField price={offer.custom} />
        <section aria-labelledby="quote-preview" aria-busy={offer.quote.isFetching} className="grid gap-1.5">
          <h3 id="quote-preview" className="text-xs font-semibold text-ink-2">
            {t.inbox.quote.preview}
          </h3>
          {offer.quote.isError && <FormAlert>{t.common.error}</FormAlert>}
          {text === null && offer.quote.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
          {text !== null && (
            <p data-testid="quote-text" className={cn('whitespace-pre-line rounded-md border border-rule bg-sunk p-3 text-sm text-ink', held && 'opacity-60')}>
              {text}
            </p>
          )}
        </section>
        {!may && <p className="rounded-md bg-gold-wash px-3 py-2 text-xs text-ink">{t.inbox.sessionClosed}</p>}
        {sender.error && <FormAlert>{sendErrorText(sender.error)}</FormAlert>}
      </div>
      {copied && (
        <Toast
          tone={copied === 'failed' ? 'error' : 'info'}
          message={copied === 'failed' ? t.inbox.quote.copyFailed : t.inbox.quote.copied}
          onDismiss={() => setCopied(null)}
        />
      )}
    </Dialog>
  );
}
