import type { PaymentLinkView } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Toast } from '@/components/ui/overlay/toast';
import { Amount } from '@/features/finance/subscriptions';
import { formatDate } from '@/features/sales/leads';
import { fillText, linkMessage } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { getDraft, setDraft } from '@/features/messaging/inbox';
import { fillComposer } from '@/features/messaging/inbox';

const P = t.paymentLinks;

type Props = {
  link: PaymentLinkView;
  /** The chat whose box gets the message. */
  phone: string;
  /** A text may go in this chat now (useMaySend): the same rule as the box itself. */
  canSend: boolean;
  onClose: () => void;
};

/**
 * Step 2: the link made. «إرسال في المحادثة» puts the message with the url into this chat's
 * box (she sends it herself; nothing leaves on its own) and it leaves as any text (owner
 * 2026-11-01): after the 24 h window too on a Kapso chat line, WhatsApp's refusal (131047)
 * shown on its bubble. Where no text can go at all only «نسخ» works (inbox.sessionClosed).
 * The amount agreed sits beside the calculator price it came from.
 */
export function CreatedLink({ link, phone, canSend, onClose }: Props) {
  const [copied, setCopied] = useState<'ok' | 'failed' | null>(null);
  const text = linkMessage(link);
  const insert = () => {
    setDraft(phone, { text: fillComposer(getDraft(phone).text, text), failed: null });
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
