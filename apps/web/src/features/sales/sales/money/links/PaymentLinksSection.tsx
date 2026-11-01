import type { PaymentLinkView } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/features/finance/payments';
import { cancelPaymentLink, PAYMENT_LINKS_KEY, paymentLinkErrorText, paymentLinksQuery, useStripeFeature } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { PortalList } from '@/features/sales/sales/students/PortalList';
import { linkColumns } from './link-columns';

const P = t.paymentLinks;

/** «روابط الدفع» under «مدفوعاتي» (docs/30, with FEATURE_STRIPE (test or live)): nothing unless useStripeFeature. */
export function PaymentLinksSection() {
  return useStripeFeature() ? <PaymentLinksList /> : null;
}

/** Her links, newest first; «إلغاء الرابط» asks once more (409 link_not_open: it was paid or expired meanwhile). */
function PaymentLinksList() {
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState<PaymentLinkView | null>(null);
  const [now] = useState(() => new Date());
  const columns = useMemo(() => linkColumns({ now, onCancel: setCancelling }), [now]);
  const cancel = useMutation({
    mutationFn: cancelPaymentLink,
    onSuccess: async () => {
      setCancelling(null);
      await queryClient.invalidateQueries({ queryKey: PAYMENT_LINKS_KEY });
    },
  });
  const close = () => {
    cancel.reset();
    setCancelling(null);
  };
  return (
    <section aria-labelledby="payment-links-title" className="mt-8 grid gap-3">
      <h2 id="payment-links-title" className="text-h4 font-bold">
        {P.list}
      </h2>
      <PortalList title={P.list} query={useQuery(paymentLinksQuery)} columns={columns} getRowId={(l) => l.id} empty={{ title: P.empty, hint: P.web.emptyHint }} />
      {cancelling && (
        <ConfirmDialog
          title={P.cancel}
          confirmLabel={P.cancel}
          pending={cancel.isPending}
          error={cancel.isError ? paymentLinkErrorText(cancel.error) : null}
          onConfirm={() => cancel.mutate(cancelling.id)}
          onClose={close}
        >
          <p className="text-sm text-ink-2">{P.cancelConfirm}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
