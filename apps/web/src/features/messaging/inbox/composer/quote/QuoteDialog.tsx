import type { ThreadView } from '@ab/shared';
import { useState } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Toast } from '@/components/ui/overlay/toast';
import { CalcSteps } from '@/features/finance/pricing';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { fillComposer } from '@/features/messaging/inbox/saved-replies/lib/filter';
import { getDraft, setDraft } from '@/features/messaging/inbox/composer/lib/draft-store';
import { sendErrorText } from '@/features/messaging/inbox/composer/lib/send-error';
import { useMaySend } from '@/features/messaging/inbox/shared/may-send';
import { QuoteActions } from './QuoteActions';
import { useQuoteOffer, useQuoteSend } from './use-quote-offer';

export interface QuoteDialogProps {
  thread: ThreadView;
  onClose: () => void;
  /** «عدّل قبل الإرسال» filled the box: the composer shows its message box. */
  onFilled: () => void;
}

/**
 * «عرض سعر» (owner 2026-10-26): the calculator's steps (pills only for the discount), the offer text
 * exactly as «حاسبة الأسعار» copies it, then send it in this chat, put it in the box to edit, or copy
 * it. Sending follows the text rule (useMaySend); where a text cannot go only copy works
 * (inbox.sessionClosed says why). Works for a lead with no
 * student; nothing is created.
 */
export function QuoteDialog({ thread, onClose, onFilled }: QuoteDialogProps) {
  const phone = thread.phone_e164;
  const offer = useQuoteOffer(phone);
  const sender = useQuoteSend(phone, onClose);
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const may = useMaySend(thread);
  const text = offer.text;
  const ready = text !== null && !offer.stale;
  const edit = () => {
    if (!text) return;
    setDraft(phone, { text: fillComposer(getDraft(phone).text, text), failed: null });
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
        <CalcSteps sel={offer.sel} onChange={offer.change} freeDiscount={false} />
        <section aria-labelledby="quote-preview" aria-busy={offer.quote.isFetching} className="grid gap-1.5">
          <h3 id="quote-preview" className="text-xs font-semibold text-ink-2">
            {t.inbox.quote.preview}
          </h3>
          {offer.quote.isError && <FormAlert>{t.common.error}</FormAlert>}
          {text === null && offer.quote.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
          {text !== null && (
            <p data-testid="quote-text" className={cn('whitespace-pre-line rounded-md border border-rule bg-sunk p-3 text-sm text-ink', offer.stale && 'opacity-60')}>
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
