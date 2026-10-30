import { formatPhone, JOB_APPLICANT_STATUSES, jobApplicantStatusStyle, type StatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { ColumnFilterDef, DataTableFeatures } from '@/components/data-table/DataTable';
import { Ltr } from '@/components/ui/display/ltr';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import { formatDate } from './format';
import type { JobApplicantRow } from './types';

const col = createColumnHelper<DataTableFeatures, JobApplicantRow>();

// A status without an ar.json label / style (e.g. a newer DB value) shows its raw value, neutral.
const statusLabel = (s: string) =>
  (t.enums.jobApplicantStatus as Record<string, string | undefined>)[s] ?? s;
const statusStyle = (s: string): StatusStyle =>
  (jobApplicantStatusStyle as Record<string, StatusStyle | undefined>)[s] ?? { tone: 'neutral', glyph: 'hollow' };

const text: ColumnFilterDef = { kind: 'text' };
const statusFilter: ColumnFilterDef = { kind: 'select', options: JOB_APPLICANT_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) };
/** A link column's filter: attached or missing. */
const presence: ColumnFilterDef = {
  kind: 'select',
  options: [
    { value: 'yes', label: t.jobApplicants.present },
    { value: 'no', label: t.jobApplicants.missing },
  ],
};

function ExternalLink({ href, label }: { href: string | null; label: string }) {
  // Phones (stacked rows, no column head): an empty link cell says nothing, so it hides.
  if (!href) return <span className="text-ink-3 max-sm:hidden">—</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-lapis underline underline-offset-4 max-sm:inline-flex max-sm:min-h-11 max-sm:items-center">
      {label}
    </a>
  );
}

/**
 * Job applicants list columns (R-LEAD-04). Under 640px: name + status, phone, CV and recitation
 * links. Every column sorts server-side; the date sorts only (R-NFR-08).
 */
export const applicantColumns = col.columns([
  col.accessor('name', {
    header: () => t.jobApplicants.name,
    cell: (c) => <span className="font-semibold max-sm:text-base">{c.getValue() ?? '—'}</span>,
    meta: { className: 'max-sm:order-1 max-sm:flex-[1_1_60%]', sortKey: 'name', filter: text },
  }),
  col.accessor('phone_e164', {
    header: () => t.jobApplicants.phone,
    cell: (c) => <Ltr className="text-ink-2">{formatPhone(c.getValue())}</Ltr>,
    meta: { className: 'max-sm:order-3 max-sm:basis-full max-sm:text-xs', sortKey: 'phone', filter: text, filterKey: 'phone' },
  }),
  col.accessor('status', {
    header: () => t.jobApplicants.status,
    cell: (c) => <StatusChip {...statusStyle(c.getValue())} label={statusLabel(c.getValue())} size="sm" />,
    meta: { className: 'max-sm:order-2', sortKey: 'status', filter: statusFilter },
  }),
  col.accessor('cv_url', {
    header: () => t.jobApplicants.cv,
    cell: (c) => <ExternalLink href={c.getValue()} label={t.jobApplicants.cv} />,
    meta: { className: 'max-sm:order-4', sortKey: 'cv', filter: presence, filterKey: 'cv' },
  }),
  col.accessor('recitation_url', {
    header: () => t.jobApplicants.recitation,
    cell: (c) => <ExternalLink href={c.getValue()} label={t.jobApplicants.recitation} />,
    meta: { className: 'max-sm:order-4', sortKey: 'recitation', filter: presence, filterKey: 'recitation' },
  }),
  col.accessor('notes', {
    header: () => t.jobApplicants.notes,
    cell: (c) => <span title={c.getValue() ?? undefined}>{c.getValue() ?? '—'}</span>,
    meta: { className: 'max-w-[28ch] truncate text-ink-2 max-sm:hidden', sortKey: 'notes', filter: text },
  }),
  col.accessor('created_at', {
    header: () => t.jobApplicants.createdAt,
    cell: (c) => <span className="tabular-nums text-ink-2">{formatDate(c.getValue())}</span>,
    meta: { className: 'max-sm:hidden', sortKey: 'created_at' },
  }),
]);
