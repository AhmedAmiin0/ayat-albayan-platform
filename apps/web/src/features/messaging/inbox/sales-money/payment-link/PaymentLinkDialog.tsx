import type { PaymentLinkView, SalesFamilyStudent, ThreadView } from '@ab/shared';
import { useState } from 'react';
import { CreatedLink } from './CreatedLink';
import { LinkForm } from './LinkForm';

type Props = { thread: ThreadView; students: SalesFamilyStudent[]; onClose: () => void };

/**
 * «رابط دفع» from a sales chat (owner 2026-10-28, docs/30, TEST BUILD ONLY; useSalesFamilyActions shows
 * it only behind useStripeFeature): the form (POST /sales/payment-links), then the link to send or copy.
 */
export function PaymentLinkDialog({ thread, students, onClose }: Props) {
  const [created, setCreated] = useState<PaymentLinkView | null>(null);
  if (created) return <CreatedLink link={created} thread={thread} onClose={onClose} />;
  return <LinkForm students={students} onClose={onClose} onCreated={setCreated} />;
}
