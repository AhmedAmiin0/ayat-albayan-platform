import { effectiveLinkStatus, PAYMENT_LINK_KINDS, type Glyph, type PaymentLinkStatus, type PaymentLinkView, type Tone } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { StatusChip } from '@/components/ui/display/status-chip';
import { Button } from '@/components/ui/form/button';
import { Amount } from '@/features/finance/subscriptions';
import { formatDate } from '@/features/sales/leads';
import { fillText } from '@/features/sales/payment-links';
import { t } from '@/lib/i18n/i18n';
import { StudentCell } from '../StudentCell';

const P = t.paymentLinks;
const col = createColumnHelper<DataTableFeatures, PaymentLinkView>();
const kindOptions = PAYMENT_LINK_KINDS.map((k) => ({ value: k, label: P.kind[k] }));

const STYLE: Record<PaymentLinkStatus, { tone: Tone; glyph: Glyph }> = {
  open: { tone: 'act', glyph: 'hollow' },
  paid: { tone: 'ok', glyph: 'fill' },
  expired: { tone: 'neutral', glyph: 'half' },
  cancelled: { tone: 'neutral', glyph: 'struck' },
};

/** «دُفع …» once paid, else «ينتهي …». */
const whenText = (l: PaymentLinkView) => (l.paid_at ? fillText(P.paidAt, { when: formatDate(l.paid_at) }) : fillText(P.expiresAt, { when: formatDate(l.expires_at) }));

type Opts = { now: Date; onCancel: (link: PaymentLinkView) => void };

// «روابط الدفع»: hers, newest first. The status as it reads now (an open link past its expiry is
// «منتهي»); «إلغاء الرابط» on an open one only.
export const linkColumns = ({ now, onCancel }: Opts) =>
  col.columns([
    col.accessor((l) => `${l.student.name} ${l.student.code}`, {
      id: 'student',
      header: () => t.assistantPortal.payments.student,
      cell: (c) => <StudentCell student={c.row.original.student} />,
      meta: { className: 'max-sm:order-1 max-sm:basis-full', filter: { kind: 'text' } },
    }),
    col.accessor((l) => effectiveLinkStatus(l, now), {
      id: 'status',
      header: () => P.web.status,
      cell: (c) => <StatusChip size="sm" label={P.status[c.getValue()]} {...STYLE[c.getValue()]} />,
      meta: { className: 'max-sm:order-4' },
    }),
    col.accessor('amount', {
      header: () => t.assistantPortal.payments.amount,
      cell: (c) => <Amount amount={c.getValue()} currency={c.row.original.currency} className="font-semibold" />,
      meta: { className: 'max-sm:order-2' },
    }),
    col.accessor('kind', {
      header: () => t.assistantPortal.payments.kind,
      cell: (c) => P.kind[c.getValue()],
      meta: { className: 'text-ink-2 max-sm:order-3 max-sm:text-sm', filter: { kind: 'select', options: kindOptions } },
    }),
    col.accessor(whenText, {
      id: 'when',
      header: () => P.web.when,
      cell: (c) => <span className="tabular-nums">{c.getValue()}</span>,
      meta: { className: 'text-xs text-ink-3 max-sm:order-5' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) =>
        effectiveLinkStatus(c.row.original, now) === 'open' && (
          <Button type="button" variant="danger-quiet" size="sm" aria-label={`${P.cancel} — ${c.row.original.student.name}`} onClick={() => onCancel(c.row.original)}>
            {P.cancel}
          </Button>
        ),
      meta: { className: 'w-px max-sm:order-6' },
    }),
  ]);
