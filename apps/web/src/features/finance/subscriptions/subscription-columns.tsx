import { cancelOffered, countsForMoney, isCancelled, PACKAGE_SIZES, subscriptionStatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/data-table/DataTable';
import { Button } from '@/components/ui/form/button';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { Amount } from './balance/Amount';
import type { SubscriptionView } from './api';
import { moneyText, packageName, progressOf } from './format';
import { partPaidText } from './payment-lines';

const col = createColumnHelper<DataTableFeatures, SubscriptionView>();

type Handlers = {
  onPay: (s: SubscriptionView, kind: 'payment' | 'refund') => void;
  /** «إيقاف مؤقت» / «استئناف»: the student's whole course (owner 2026-10-28), not this package alone. */
  onPause: (s: SubscriptionView) => void;
  onResume: (s: SubscriptionView) => void;
  /** courses.pause */
  canPause: boolean;
  onCancel: (s: SubscriptionView) => void;
  onOpen: (studentId: string) => void;
};

/** «الباقة» filter: the catalog sizes (a trial is never a package). */
const packageOptions = PACKAGE_SIZES.filter((p) => p !== 'trial').map((p) => ({ value: p, label: t.enums.packageSize[p] }));

/**
 * Packages list (R-SUB-01): student, package, price/paid, the package line, status, actions.
 * Server sort (R-NFR-08) on package, price and status; filters: the student's name and the
 * package here, the status in the page head. The student (an embedded name) and the package line
 * (derived from the lessons) do not sort server-side.
 */
export function subscriptionColumns({ onPay, onPause, onResume, canPause, onCancel, onOpen }: Handlers) {
  return col.columns([
    col.accessor('student', {
      header: () => t.subscriptions.student,
      cell: (c) => (
        <div className="grid">
          <button type="button" onClick={() => onOpen(c.getValue().id)} className="text-start font-semibold text-ink hover:underline">
            {c.getValue().name}
          </button>
          <Ltr className="text-2xs text-ink-3">{c.getValue().code}</Ltr>
        </div>
      ),
      meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', filter: { kind: 'text' } },
    }),
    col.accessor('package', {
      header: () => t.subscriptions.package,
      cell: (c) => packageName(c.row.original),
      meta: { className: 'max-sm:order-3 max-sm:text-xs', sortKey: 'package', filter: { kind: 'select', options: packageOptions } },
    }),
    col.accessor('price', {
      header: () => t.subscriptions.price,
      cell: (c) => {
        const s = c.row.original;
        return (
          <div className="grid">
            <Amount amount={s.price} currency={s.currency} className="font-semibold" />
            {s.paid < s.price && countsForMoney(s) && (
              <span className="text-2xs text-ink-3">
                {t.payments.paidOf
                  .replace('{paid}', moneyText(s.paid, s.currency))
                  .replace('{price}', moneyText(s.price, s.currency))}
              </span>
            )}
          </div>
        );
      },
      meta: { className: 'max-sm:order-4', sortKey: 'price' },
    }),
    col.accessor('balance', {
      header: () => t.subscriptions.balance,
      cell: (c) => {
        if (!countsForMoney(c.row.original)) return <span className="text-sm text-ink-3">—</span>;
        const p = progressOf(c.getValue());
        return <span className={cn('text-sm', p.tone === 'act' ? 'font-semibold text-act' : 'text-ink-2')}>{p.remainingLabel}</span>;
      },
      meta: { className: 'max-sm:order-5 max-sm:text-xs' },
    }),
    col.accessor('status', {
      header: () => t.subscriptions.status,
      cell: (c) => {
        // «Why is this unpaid» (owner 2026-10-28): 80 of 81 stays unpaid; the line says what is left.
        const part = partPaidText(c.row.original);
        return (
          <div className="grid justify-items-start gap-0.5">
            <StatusChip size="sm" {...subscriptionStatusStyle[c.getValue()]} label={t.enums.subscriptionStatus[c.getValue()]} />
            {part && <span className="text-2xs font-semibold text-act">{part}</span>}
          </div>
        );
      },
      meta: { className: 'max-sm:order-2', sortKey: 'status' },
    }),
    col.display({
      id: 'actions',
      header: () => t.common.actions,
      cell: (c) => {
        const s = c.row.original;
        // An unused cancel (owner 2026-10-28) is history only; a stopped one (991) still takes payments
        // and refunds (countsForMoney), never a pause.
        if (!countsForMoney(s)) return null;
        return (
          <div className="flex gap-2">
            {s.paid < s.price && (
              <Button type="button" variant="secondary" size="sm" onClick={() => onPay(s, 'payment')}>
                {t.payments.record}
              </Button>
            )}
            {s.paid > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onPay(s, 'refund')}>
                {t.finance.refund}
              </Button>
            )}
            {canPause && !isCancelled(s) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => (s.status === 'paused' ? onResume(s) : onPause(s))}>
                {s.status === 'paused' ? t.coursePause.resume : t.coursePause.action}
              </Button>
            )}
            {cancelOffered(s) && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onCancel(s)}>
                {t.subscriptions.cancel.action}
              </Button>
            )}
          </div>
        );
      },
      meta: { className: 'w-px max-sm:order-6' },
    }),
  ]);
}
