import type { ReportFormEntry, ReportFormResponse, UserRole } from '@ab/shared';
import type { ComponentType } from 'react';
import { ReportEntry } from './entry/ReportEntry';
import { ReportEntryV2 } from './entry-v2/ReportEntryV2';
import { AdminReportV2 } from './view-v2/AdminReportV2';

export interface ReportEntryFormProps {
  form: ReportFormResponse;
  entry: ReportFormEntry;
  role: UserRole;
  titled: boolean;
  tz: string;
}

type EntryView = ComponentType<Omit<ReportEntryFormProps, 'role'>>;
type Kind = 'v1' | 'v2' | 'admin_v2';

/** The old form for form_version 1; the new form for version 2, which the admin reads and edits. */
const VIEWS: Record<Kind, EntryView> = {
  v1: ReportEntry,
  v2: ReportEntryV2,
  admin_v2: AdminReportV2,
};
const V2_BY_ROLE: Partial<Record<UserRole, Kind>> = { admin: 'admin_v2' };

function kindOf(version: number, role: UserRole): Kind {
  if (version !== 2) return 'v1';
  return V2_BY_ROLE[role] ?? 'v2';
}

/** One student's report on the form, in the form its version and the viewer's role call for. */
export function ReportEntryForm({ role, ...props }: ReportEntryFormProps) {
  const View = VIEWS[kindOf(props.entry.report.form_version, role)];
  return <View {...props} />;
}
