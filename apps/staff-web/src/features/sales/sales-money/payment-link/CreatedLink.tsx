import type { PaymentLinkView } from '@ab/shared';
import { useState } from 'react';
import { Button, Dialog, Toast, t } from '@ab/web-kit';
import { Amount } from '@/features/finance/subscriptions';
import { formatDate } from '@/features/sales/leads';
import { fillText, linkMessage } from '@/features/sales/payment-links';
import { getDraft, keptFailed, setDraft } from '@/features/messaging/inbox';
import { fillComposer } from '@/features/messaging/inbox';

const P = t.paymentLinks;

type Props = {
  link: PaymentLinkView;
  /** The chat whose box gets the message. */
  phone: string;
  /** A text may go in this chat now (useMaySend): the same rule as the box itself. */
  canSend: boolean;
  onClose: () => void;
  /** Opens the course dialog over this one; the picks are kept until paid. */
  onBookCourse?: (() => void) | undefined;
};

/** She sends the message herself; the course picks wait as a draft and are booked once paid. */
export function CreatedLink({ link, phone, canSend, onClose, onBookCourse }: Props) {
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const text = linkMessage(link);
  const insert = () => {
    const now = getDraft(phone);
    // An unconfirmed send keeps its id for the box's retry (docs/44 BUG7).
    setDraft(phone, { text: fillComposer(now.text, text), failed: keptFailed(now.failed) });
    onClose();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied('ok');
    } catch {
      setCopied('failed');
    }
  };
  const actions = (
    <>
      {onBookCourse && (
        <Button variant="secondary" onClick={onBookCourse}>
          {t.courseDraft.pick}
        </Button>
      )}
      <Button variant="secondary" onClick={() => void copy()}>
        {P.copy}
      </Button>
      <Button disabled={!canSend} onClick={insert}>
        {P.sendInChat}
      </Button>
    </>
  );
  return (
    <Dialog title={P.title} onClose={onClose} actions={actions}>
      <div className="grid gap-4">
        <p role="status" className="text-sm font-semibold text-ok">
          {fillText(P.created, { when: formatDate(link.expires_at) })}
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-ink-3">{P.web.agreed}</dt>
          <dd data-testid="link-amount" className="font-semibold">
            <Amount amount={link.amount} currency={link.currency} />
          </dd>
          <dt className="text-ink-3">{P.web.reference}</dt>
          <dd data-testid="link-reference" className="text-ink-2">
            <Amount amount={link.reference_price} currency={link.currency} />
          </dd>
        </dl>
        <p dir="ltr" className="break-all rounded-md border border-rule bg-sunk p-3 text-start text-sm">
          {link.url}
        </p>
        {!canSend && <p className="rounded-md bg-gold-wash px-3 py-2 text-xs text-ink">{t.inbox.sessionClosed}</p>}
      </div>
      {copied && (
        <Toast
          tone={copied === 'failed' ? 'error' : 'info'}
          message={copied === 'failed' ? P.web.copyFailed : P.copied}
          onDismiss={() => setCopied(null)}
        />
      )}
    </Dialog>
  );
}
