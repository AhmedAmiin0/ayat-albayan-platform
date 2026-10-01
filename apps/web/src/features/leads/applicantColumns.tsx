import { jobApplicantStatusStyle, type StatusStyle } from '@ab/shared';
import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { formatDateTime } from './format';
import type { JobApplicantRow } from './types';

const col = createColumnHelper<DataTableFeatures, JobApplicantRow>();

// A status without an ar.json label / style (e.g. a newer DB value) shows its raw value, neutral.
const statusLabel = (s: string) =>
  (t.enums.jobApplicantStatus as Record<string, string | undefined>)[s] ?? s;
const statusStyle = (s: string): StatusStyle =>
  (jobApplicantStatusStyle as Record<string, StatusStyle | undefined>)[s] ?? { tone: 'neutral', glyph: 'hollow' };

function ExternalLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <span className="text-ink-3">—</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-lapis underline underline-offset-4">
      {label}
    </a>
  );
}

/** Job applicants list columns (R-LEAD-04). */
export const applicantColumns = col.columns([
  col.accessor('name', {
    header: () => t.jobApplicants.name,
    cell: (c) => <span className="font-semibold">{c.getValue() ?? '—'}</span>,
  }),
  col.accessor('phone_e164', {
    header: () => t.jobApplicants.phone,
    cell: (c) => <Ltr className="text-ink-2">{c.getValue()}</Ltr>,
  }),
  col.accessor('status', {
    header: () => t.jobApplicants.status,
    cell: (c) => <StatusChip {...statusStyle(c.getValue())} label={statusLabel(c.getValue())} size="sm" />,
  }),
  col.accessor('cv_url', {
    header: () => t.jobApplicants.cv,
    cell: (c) => <ExternalLink href={c.getValue()} label={t.jobApplicants.cv} />,
  }),
  col.accessor('recitation_url', {
    header: () => t.jobApplicants.recitation,
    cell: (c) => <ExternalLink href={c.getValue()} label={t.jobApplicants.recitation} />,
  }),
  col.accessor('notes', {
    header: () => t.jobApplicants.notes,
    cell: (c) => <span title={c.getValue() ?? undefined}>{c.getValue() ?? '—'}</span>,
    meta: { className: 'max-w-[28ch] truncate text-ink-2' },
  }),
  col.accessor('created_at', {
    header: () => t.jobApplicants.createdAt,
    cell: (c) => <span className="tabular-nums text-ink-2">{formatDateTime(c.getValue())}</span>,
  }),
]);
