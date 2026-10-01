import { createColumnHelper } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/components/DataTable';
import { t } from '@/lib/i18n';
import { formatDateTime } from './format';
import { StatusChip } from './StatusChip';
import type { JobApplicantRow } from './types';

const col = createColumnHelper<DataTableFeatures, JobApplicantRow>();

// TODO(R-LEAD-04): 'reviewing' / 'interview' have no ar.json label until the integrator adds them
// to enums.jobApplicantStatus (with the shared enum); until then the raw value shows.
const statusLabel = (s: string) =>
  (t.enums.jobApplicantStatus as Record<string, string | undefined>)[s] ?? s;

function ExternalLink({ href, label }: { href: string | null; label: string }) {
  if (!href) return <>—</>;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
      {label}
    </a>
  );
}

/** Job applicants list columns (R-LEAD-04). */
export const applicantColumns = col.columns([
  col.accessor('name', { header: () => t.jobApplicants.name, cell: (c) => c.getValue() ?? '—' }),
  col.accessor('phone_e164', {
    header: () => t.jobApplicants.phone,
    cell: (c) => <span dir="ltr">{c.getValue()}</span>,
  }),
  col.accessor('status', {
    header: () => t.jobApplicants.status,
    cell: (c) => <StatusChip status={c.getValue()} label={statusLabel(c.getValue())} />,
  }),
  col.accessor('cv_url', {
    header: () => t.jobApplicants.cv,
    cell: (c) => <ExternalLink href={c.getValue()} label={t.jobApplicants.cv} />,
  }),
  col.accessor('recitation_url', {
    header: () => t.jobApplicants.recitation,
    cell: (c) => <ExternalLink href={c.getValue()} label={t.jobApplicants.recitation} />,
  }),
  col.accessor('notes', { header: () => t.jobApplicants.notes, cell: (c) => c.getValue() ?? '—' }),
  col.accessor('created_at', {
    header: () => t.jobApplicants.createdAt,
    cell: (c) => formatDateTime(c.getValue()),
  }),
]);
