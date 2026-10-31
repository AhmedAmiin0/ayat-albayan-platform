import { effectiveLinkStatus, type PaymentLinkView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '@/inbox';
import { instantDay, money } from '@/payments';
import { fill } from '@/sales';
import { useCancelLink } from '../link-api';
import { linkErrorText, linkStatusStyle } from '../link-text';
import { useViewerTz } from '@/core/lib/clock';

const pl = t.paymentLinks;

interface PaymentLinkItemProps {
  link: PaymentLinkView;
  now: Date;
  /** No «إلغاء الرابط» (/pay-done: a payment may still be on its way from Stripe). */
  readOnly?: boolean;
}

/** «يوسف · 250 ر.س · ينتهي 1 نوفمبر 2026» with its status (an open link past its expiry reads expired). */
export function PaymentLinkItem({ link, now, readOnly = false }: PaymentLinkItemProps) {
  const tz = useViewerTz();
  const status = effectiveLinkStatus(link, now);
  const cancel = useCancelLink();
  const [asking, setAsking] = useState(false);
  const when = link.paid_at
    ? fill(pl.paidAt, { when: instantDay(link.paid_at, tz) })
    : fill(pl.expiresAt, { when: instantDay(link.expires_at, tz) });
  return (
    <View>
      <ListRow
        title={link.student.name}
        meta={link.student.code}
        subtitle={`${money(link.amount, link.currency)} · ${when}`}
        trailing={<StatusChip {...linkStatusStyle[status]} label={pl.status[status]} size="sm" />}
      />
      {status === 'open' && !readOnly ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, gap: 6 }}>
          {asking ? (
            <InlineConfirm
              tone="danger"
              message={pl.cancelConfirm}
              confirmLabel={cancel.isPending ? t.paymentLinks.mobile.cancelling : pl.cancel}
              busy={cancel.isPending}
              onConfirm={() => cancel.mutate(link.id, { onSuccess: () => setAsking(false) })}
              onCancel={() => setAsking(false)}
            />
          ) : (
            <Button variant="danger" label={pl.cancel} accessibilityLabel={`${pl.cancel} — ${link.student.name}`} onPress={() => setAsking(true)} />
          )}
          {cancel.isError ? <ErrorLine message={linkErrorText(cancel.error, pl.mobile.cancelFailed)} /> : null}
        </View>
      ) : null}
    </View>
  );
}
