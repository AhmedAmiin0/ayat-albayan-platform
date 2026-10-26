import type { AssistantCommissionStatus, MyStudentRow } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { formatDate } from '@/features/leads/format';
import { Amount } from '@/features/subscriptions/balance/Amount';
import { t } from '@/lib/i18n/i18n';

const col = createColumnHelper<DataTableFeatures, MyStudentRow>();

/** «مستحقة» is settled money (ok); «ملغاة» was taken back (neutral, struck). */
export function CommissionChip({ status }: { status: AssistantCommissionStatus }) {
  return status === 'earned' ? (
    <StatusChip size="sm" tone="ok" glyph="fill" label={t.assistantPortal.commission.earned} />
  ) : (
    <StatusChip size="sm" tone="neutral" glyph="struck" label={t.assistantPortal.commission.voided} />
  );
}

const paidOptions = [
  { value: 'paid', label: t.assistantPortal.students.paid },
  { value: 'unpaid', label: t.assistantPortal.students.unpaid },
];

// «طلابي»: the students I brought. Only the date, whether the first subscription is paid, and my own
// commission: never a price or another person's money. Stacked under 640px.
export const myStudentColumns = col.columns([
  col.accessor((s) => `${s.name} ${s.code}`, {
    id: 'student',
    header: () => t.assistantPortal.students.student,
    cell: (c) => (
      <span className="inline-flex items-baseline gap-3">
        <span className="font-semibold">{c.row.original.name}</span>
        <Ltr className="text-sm text-ink-2">{c.row.original.code}</Ltr>
      </span>
    ),
    meta: { className: 'max-sm:order-1 max-sm:basis-full', filter: { kind: 'text' } },
  }),
  col.accessor('brought_at', {
    header: () => t.assistantPortal.students.broughtAt,
    cell: (c) => <span className="tabular-nums">{formatDate(c.getValue())}</span>,
    meta: { className: 'text-ink-2 max-sm:order-3 max-sm:text-sm' },
  }),
  col.accessor((s) => (s.first_subscription_paid ? 'paid' : 'unpaid'), {
    id: 'first_paid',
    header: () => t.assistantPortal.students.firstPaid,
    cell: (c) =>
      c.getValue() === 'paid' ? (
        <StatusChip size="sm" tone="ok" glyph="fill" label={t.assistantPortal.students.paid} />
      ) : (
        <StatusChip size="sm" tone="act" glyph="hollow" label={t.assistantPortal.students.unpaid} />
      ),
    meta: { className: 'max-sm:order-2', filter: { kind: 'select', options: paidOptions } },
  }),
  col.accessor((s) => s.commission?.amount ?? 0, {
    id: 'commission',
    header: () => t.assistantPortal.students.commission,
    cell: (c) => {
      const earned = c.row.original.commission;
      if (!earned) return <span className="text-ink-3">—</span>;
      return (
        <div className="grid justify-items-start gap-0.5">
          <Amount amount={earned.amount} currency={earned.currency} className="font-semibold" />
          <CommissionChip status={earned.status} />
        </div>
      );
    },
    meta: { className: 'max-sm:order-4' },
  }),
]);
